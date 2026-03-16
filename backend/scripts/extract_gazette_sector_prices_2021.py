#!/usr/bin/env python3
import csv
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PDF_PATH = ROOT / "docs" / "official_gazette _regulations" / "Ibiciro_fatizo_by_ubutaka_-_2021.pdf"
TXT_PATH = Path("/tmp/gazette_2021_layout.txt")
OUT_PATH = ROOT / "docs" / "database" / "gazette_2021_sector_prices.csv"

PROVINCES = ["Kigali", "Eastern Province", "Northern Province", "Southern Province", "Western Province"]

DISTRICT_TO_PROVINCE = {
    "Gasabo": "Kigali",
    "Kicukiro": "Kigali",
    "Nyarugenge": "Kigali",
    "Bugesera": "Eastern Province",
    "Gatsibo": "Eastern Province",
    "Kayonza": "Eastern Province",
    "Kirehe": "Eastern Province",
    "Ngoma": "Eastern Province",
    "Nyagatare": "Eastern Province",
    "Rwamagana": "Eastern Province",
    "Burera": "Northern Province",
    "Gakenke": "Northern Province",
    "Gicumbi": "Northern Province",
    "Musanze": "Northern Province",
    "Rulindo": "Northern Province",
    "Gisagara": "Southern Province",
    "Huye": "Southern Province",
    "Kamonyi": "Southern Province",
    "Muhanga": "Southern Province",
    "Nyamagabe": "Southern Province",
    "Nyanza": "Southern Province",
    "Nyaruguru": "Southern Province",
    "Ruhango": "Southern Province",
    "Karongi": "Western Province",
    "Ngororero": "Western Province",
    "Nyabihu": "Western Province",
    "Nyamasheke": "Western Province",
    "Rubavu": "Western Province",
    "Rusizi": "Western Province",
    "Rutsiro": "Western Province",
}

DISTRICTS = set(DISTRICT_TO_PROVINCE.keys())

ROW_RE = re.compile(
    r"^(?P<indent>\s*)(?P<name>[A-Za-z][A-Za-z'()/+\-.& ]{1,70}?)\s+"
    r"(?P<min>\d{1,3}(?:,\d{3})*|\d+)\s+"
    r"(?P<avg>\d{1,3}(?:,\d{3})*|\d+)\s+"
    r"(?P<max>\d{1,3}(?:,\d{3})*|\d+)\s*$"
)

EXCLUDE_NAMES = {
    "Sector", "Cell", "Village", "Land Use", "Minimum Value Per Sqm",
    "Weighted Average Value Per Sqm", "Maximum Value Per Sqm",
    "Official Gazette", "Urban Land Values", "Rural Land Values",
}


def clean_num(s: str) -> float:
    return float(s.replace(",", ""))


def looks_like_land_use(name: str) -> bool:
    checks = [
        "Residential", "Commercial", "Plantation", "Wetland", "Forest",
        "Facilities", "Farm Land", "Mining", "Religious", "River", "Warehousing",
    ]
    return any(k.lower() in name.lower() for k in checks)


def main() -> None:
    if not PDF_PATH.exists():
        raise SystemExit(f"PDF not found: {PDF_PATH}")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    subprocess.run([
        "pdftotext", "-layout", str(PDF_PATH), str(TXT_PATH)
    ], check=True)

    province = ""
    district = ""
    area_classification = "unknown"
    seen = set()
    rows = []

    with TXT_PATH.open("r", encoding="utf-8", errors="ignore") as f:
        for raw in f:
            line = raw.rstrip("\n")
            stripped = line.strip()
            if not stripped:
                continue

            for p in PROVINCES:
                if p in stripped:
                    if province != p:
                        province = p
                        # Avoid carrying a district from a previous province section.
                        district = ""

            # District heading patterns in the gazette (e.g., "1. Gasabo", "Urban Rusizi", "Gasabo").
            for d in DISTRICTS:
                district_patterns = [
                    rf"^\d+\.\s*{re.escape(d)}$",
                    rf"^Urban\s+{re.escape(d)}$",
                    rf"^{re.escape(d)}$",
                ]
                if any(re.match(pat, stripped, flags=re.IGNORECASE) for pat in district_patterns):
                    district = d
                    province = DISTRICT_TO_PROVINCE[d]
                    break

            if stripped.lower().startswith("urban "):
                area_classification = "urban"
                candidate = stripped[6:].strip()
                if candidate in DISTRICTS:
                    district = candidate
                    province = DISTRICT_TO_PROVINCE[candidate]
            elif "RURAL LAND VALUES" in stripped or stripped.lower().startswith("rural"):
                area_classification = "rural"
            elif "URBAN LAND VALUES" in stripped or stripped.lower().startswith("urban land"):
                area_classification = "urban"

            if stripped in DISTRICTS:
                district = stripped
                province = DISTRICT_TO_PROVINCE[stripped]

            m = ROW_RE.match(line)
            if not m:
                continue

            indent = len(m.group("indent"))
            name = re.sub(r"\s+", " ", m.group("name")).strip()
            if not name or name in EXCLUDE_NAMES:
                continue

            # Sector rows are expected with little/no indentation.
            if indent > 2:
                continue

            # Filter obvious non-sector rows.
            if looks_like_land_use(name):
                continue

            if not province or not district:
                continue

            min_v = clean_num(m.group("min"))
            avg_v = clean_num(m.group("avg"))
            max_v = clean_num(m.group("max"))

            key = (province, district, name, area_classification, min_v, avg_v, max_v)
            if key in seen:
                continue
            seen.add(key)

            rows.append({
                "gazette_version": "2021",
                "source_document": "docs/official_gazette _regulations/Ibiciro_fatizo_by_ubutaka_-_2021.pdf",
                "effective_from": "2021-12-01",
                "effective_to": "",
                "province": province,
                "district": district,
                "sector": name,
                "area_classification": area_classification,
                "minimum_value_per_sqm": f"{min_v:.2f}",
                "weighted_avg_value_per_sqm": f"{avg_v:.2f}",
                "maximum_value_per_sqm": f"{max_v:.2f}",
                "confidence_score": "0.70",
                "raw_line": stripped,
            })

    with OUT_PATH.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[
            "gazette_version",
            "source_document",
            "effective_from",
            "effective_to",
            "province",
            "district",
            "sector",
            "area_classification",
            "minimum_value_per_sqm",
            "weighted_avg_value_per_sqm",
            "maximum_value_per_sqm",
            "confidence_score",
            "raw_line",
        ])
        w.writeheader()
        w.writerows(rows)

    print(f"Extracted {len(rows)} candidate sector rows -> {OUT_PATH}")


if __name__ == "__main__":
    main()
