package workers

import (
	"context"
	"fmt"
	"log"
	"time"

	"backend/internal/repository"
	"backend/internal/services"
	"backend/pkg/alert"
	"backend/pkg/metrics"
)

// PaymentStatusWorker polls payment providers for transaction status updates.
// StartPaymentStatusWorker polls payment providers for transaction status updates and sends invoice emails on success.
func StartPaymentStatusWorker(
	ctx context.Context,
	interval time.Duration,
	paymentService *services.PaymentService,
	txnRepo *repository.TransactionRepository,
	userService *services.UserService,
	invoiceService *services.InvoiceService,
	emailService *services.EmailService,
) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		errorCount := 0
		const alertThreshold = 3 // Send alert after 3 consecutive errors
		for {
			select {
			case <-ctx.Done():
				log.Println("Payment status worker stopped.")
				return
			case <-ticker.C:
				// log.Printf("msg=\"Polling payment status...\" time=%s", time.Now().Format(time.RFC3339))
				pendingTxns, err := txnRepo.ListPending(ctx)
				if err != nil {
					metrics.WorkerErrors.Inc()
					log.Printf("msg=\"Failed to fetch pending transactions\" error=%q time=%s", err, time.Now().Format(time.RFC3339))
					errorCount++
					if errorCount >= alertThreshold {
						if err := alert.SendEmail(
							"Payment Worker Error: DB Fetch",
							fmt.Sprintf("Failed to fetch pending transactions: %v (time: %s)", err, time.Now().Format(time.RFC3339)),
						); err != nil {
							log.Printf("msg=\"Failed to send worker alert email\" error=%q", err)
						}
						metrics.WorkerAlertEmails.Inc()
						errorCount = 0
					}
					continue
				}
				errorCount = 0 // Reset on success
				metrics.LastSuccessfulPoll.SetToCurrentTime()
				for _, txn := range pendingTxns {
					provider := txn.PaymentProvider
					txnID := fmt.Sprintf("%d", txn.ID)
					log.Printf("msg=\"Checking status\" txn_id=%s provider=%s time=%s", txnID, provider, time.Now().Format(time.RFC3339))
					// Check payment status
					_, err := paymentService.CheckPaymentStatus(ctx, txnID, provider)
					metrics.PolledTransactions.Inc()
					metrics.WorkerSuccesses.Inc()
					if err != nil {
						metrics.WorkerErrors.Inc()
						log.Printf("msg=\"Error checking status\" txn_id=%s provider=%s error=%q time=%s", txnID, provider, err, time.Now().Format(time.RFC3339))
						errorCount++
						if errorCount >= alertThreshold {
							if err := alert.SendEmail(
								"Payment Worker Error: Status Check",
								fmt.Sprintf("Error checking status for txn %s (provider: %s): %v (time: %s)", txnID, provider, err, time.Now().Format(time.RFC3339)),
							); err != nil {
								log.Printf("msg=\"Failed to send worker alert email\" error=%q", err)
							}
							metrics.WorkerAlertEmails.Inc()
							errorCount = 0
						}
						continue
					}
					errorCount = 0 // Reset on success

					// If payment is successful, send invoice email (only once)
					// Reload transaction to get updated status
					updatedTxn, err := txnRepo.GetByID(ctx, txn.ID)
					if err != nil {
						log.Printf("msg=\"Failed to reload transaction for invoice email\" txn_id=%s error=%q", txnID, err)
						continue
					}
					if (updatedTxn.Status == "success" || updatedTxn.Status == "completed") && !updatedTxn.InvoiceEmailed {
						// Fetch user
						user, err := userService.GetUserByID(ctx, fmt.Sprintf("%d", updatedTxn.UserID))
						if err != nil || user == nil {
							log.Printf("msg=\"Failed to fetch user for invoice email\" txn_id=%s user_id=%d error=%q", txnID, updatedTxn.UserID, err)
							continue
						}
						// Generate invoice HTML
						invoiceHTML, err := invoiceService.GenerateInvoiceHTML(ctx, updatedTxn, user)
						if err != nil {
							log.Printf("msg=\"Failed to generate invoice HTML\" txn_id=%s error=%q", txnID, err)
							continue
						}
						// Send invoice email
						err = emailService.SendInvoiceEmail(user.Email, user.FirstName+" "+user.LastName, invoiceHTML)
						if err != nil {
							log.Printf("msg=\"Failed to send invoice email\" txn_id=%s email=%s error=%q", txnID, user.Email, err)
						} else {
							log.Printf("msg=\"Invoice email sent\" txn_id=%s email=%s", txnID, user.Email)
							// Mark invoice as emailed
							updatedTxn.InvoiceEmailed = true
							if err := txnRepo.Update(ctx, updatedTxn); err != nil {
								log.Printf("msg=\"Failed to update InvoiceEmailed flag\" txn_id=%s error=%q", txnID, err)
							}
						}
					}
				}
			}
		}
	}()
}
