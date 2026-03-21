package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
)

var (
	PolledTransactions = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "payment_worker_polled_transactions_total",
			Help: "Total number of transactions polled by the payment status worker.",
		},
	)
	WorkerErrors = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "payment_worker_errors_total",
			Help: "Total number of errors encountered by the payment status worker.",
		},
	)
	LastSuccessfulPoll = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "payment_worker_last_successful_poll_timestamp",
			Help: "Unix timestamp of the last successful poll.",
		},
	)
	WorkerSuccesses = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "payment_worker_successes_total",
			Help: "Total number of successful payment status checks.",
		},
	)
	WorkerAlertEmails = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "payment_worker_alert_emails_total",
			Help: "Total number of alert emails sent by the payment status worker.",
		},
	)
)

func Register() {
	prometheus.MustRegister(PolledTransactions, WorkerErrors, LastSuccessfulPoll, WorkerSuccesses, WorkerAlertEmails)
}
