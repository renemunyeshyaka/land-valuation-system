package main

import (
	"encoding/csv"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strings"
	"time"
)

const (
	defaultURL = "https://www.lands.rw/home"
)

func main() {
	url := flag.String("url", defaultURL, "Source page URL")
	outputPath := flag.String("out", "", "Optional CSV output path (defaults to stdout)")
	flag.Parse()

	if os.Getenv("ALLOW_LANDSRW_DEMO_SCRAPE") != "true" {
		fmt.Fprintln(os.Stderr, "demo scrape blocked: set ALLOW_LANDSRW_DEMO_SCRAPE=true")
		os.Exit(1)
	}

	candidates, err := scrapeUPICandidates(*url)
	if err != nil {
		fmt.Fprintf(os.Stderr, "scrape failed: %v\n", err)
		os.Exit(1)
	}

	if len(candidates) == 0 {
		fmt.Fprintln(os.Stderr, "no UPI-like candidates found")
		os.Exit(1)
	}

	if err := writeCSV(*outputPath, *url, candidates); err != nil {
		fmt.Fprintf(os.Stderr, "csv write failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Fprintf(os.Stderr, "demo complete: extracted %d candidate identifiers\n", len(candidates))
}

func scrapeUPICandidates(url string) ([]string, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "LVS-Demo-Scraper/1.0 (non-production)")

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	text := string(body)

	// Heuristic extraction for demo purposes. Real production ingestion should use
	// an approved data feed with a stable contract and schema.
	numeric := regexp.MustCompile(`\b\d{4,20}\b`)
	found := numeric.FindAllString(text, -1)
	if len(found) == 0 {
		return nil, errors.New("no numeric candidates matched")
	}

	unique := make(map[string]struct{}, len(found))
	for _, token := range found {
		trimmed := strings.TrimSpace(token)
		if trimmed == "" {
			continue
		}
		unique[trimmed] = struct{}{}
	}

	candidates := make([]string, 0, len(unique))
	for id := range unique {
		candidates = append(candidates, id)
	}
	sort.Strings(candidates)

	return candidates, nil
}

func writeCSV(outputPath, sourceURL string, candidates []string) error {
	var (
		writer io.Writer = os.Stdout
		file   *os.File
		err    error
	)

	if outputPath != "" {
		file, err = os.Create(outputPath)
		if err != nil {
			return err
		}
		defer file.Close()
		writer = file
	}

	csvWriter := csv.NewWriter(writer)
	defer csvWriter.Flush()

	if err := csvWriter.Write([]string{"source_url", "candidate_upi"}); err != nil {
		return err
	}

	for _, upi := range candidates {
		if err := csvWriter.Write([]string{sourceURL, upi}); err != nil {
			return err
		}
	}

	return csvWriter.Error()
}
