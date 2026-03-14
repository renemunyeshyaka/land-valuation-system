import csv

# Extract UPI column from the large CSV and write to upi_list.txt
input_csv = '../../data/ubutaka_semiannual_clean.csv'
output_txt = 'upi_list.txt'

with open(input_csv, newline='', encoding='utf-8') as csvfile, open(output_txt, 'w', encoding='utf-8') as outfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        upi = row.get('upi') or row.get('UPI')
        if upi:
            outfile.write(upi.strip() + '\n')
print('UPI list extraction complete.')
