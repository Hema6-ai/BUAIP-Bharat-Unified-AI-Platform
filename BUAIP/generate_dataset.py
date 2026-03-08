import csv
import random
from datetime import datetime, timedelta
from collections import defaultdict

# State to Districts mapping (major Indian states with representative districts)
STATE_DISTRICTS = {
    "Andhra Pradesh": ["Visakhapatnam", "Krishna", "Guntur", "Nellore", "Chittoor", "Kadapa"],
    "Assam": ["Kamrup", "Barpeta", "Nagaon", "Sonitpur", "Cachar", "Morigaon"],
    "Bihar": ["Patna", "East Champaran", "West Champaran", "Madhubani", "Araria", "Muzaffarpur"],
    "Chhattisgarh": ["Raipur", "Durg", "Bilaspur", "Rajnandgaon", "Bastar", "Janjgir-Champa"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Junagadh", "Bharuch"],
    "Haryana": ["Hisar", "Faridabad", "Gurgaon", "Rohtak", "Ambala", "Karnal"],
    "Himachal Pradesh": ["Kangra", "Mandi", "Shimla", "Solan", "Kinnaur", "Lahul"],
    "Jharkhand": ["Ranchi", "Dhanbad", "Giridih", "Dumka", "Godda", "Deoghar"],
    "Karnataka": ["Bangalore", "Mysore", "Belgaum", "Mangalore", "Hubli", "Tumkur"],
    "Kerala": ["Ernakulathappan", "Thrissur", "Kozhikode", "Thiruvananthapuram", "Kottayam", "Kannur"],
    "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Ujjain", "Sagar", "Gwalior"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Kolhapur"],
    "Manipur": ["Imphal East", "Imphal West", "Bishnupur", "Thoubal", "Ukhrul", "Senapati"],
    "Meghalaya": ["East Khasi Hills", "West Khasi Hills", "East Garo Hills", "West Garo Hills", "Cima", "Jaintia Hills"],
    "Mizoram": ["Aizawl", "Lunglei", "Saiha", "Champhai", "Kolasib", "Mamit"],
    "Nagaland": ["Kohima", "Dimapur", "Wokha", "Tuensang", "Zunheboto", "Peren"],
    "Odisha": ["Cuttack", "Balasore", "Bargarh", "Bhubaneswar", "Sambalpur", "Jajpur"],
    "Punjab": ["Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Ferozepur", "Sangrur"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Bikaner", "Ajmer", "Barmer"],
    "Sikkim": ["East Sikkim", "West Sikkim", "North Sikkim", "South Sikkim"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruppur", "Salem", "Kancheepuram"],
    "Telangana": ["Hyderabad", "Rangareddy", "Medchal", "Nalgonda", "Karimnagar", "Warangal"],
    "Tripura": ["West Tripura", "South Tripura", "Dhalai", "Khowai"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Meerut", "Varanasi", "Banaras"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Almora", "Nainital", "Pithoragarh", "Bageshwar"],
    "West Bengal": ["Kolkata", "Howrah", "Darjeeling", "Jalpaiguri", "Murshidabad", "Birbhum"]
}

# Read schemes from CSV
schemes_by_domain = defaultdict(list)
with open('public/india_schemes_7domains.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        scheme_name = row['scheme_name'].strip()
        domain = row['domain'].strip()
        if scheme_name and domain:
            schemes_by_domain[domain].append(scheme_name)

print(f"Loaded {sum(len(v) for v in schemes_by_domain.values())} schemes across {len(schemes_by_domain)} domains")
for domain, schemes in sorted(schemes_by_domain.items()):
    print(f"  {domain}: {len(schemes)} schemes")

# Define domains for category selection (matching CSV domains)
domains = list(schemes_by_domain.keys())

# Generate synthetic dataset
records = []
start_date = datetime.now() - timedelta(days=365)
end_date = datetime.now()

for i in range(5000):
    user_id = f"USR{i+1:06d}"
    state = random.choice(list(STATE_DISTRICTS.keys()))
    district = random.choice(STATE_DISTRICTS[state])
    category_selected = random.choice(domains)
    scheme_shown = random.choice(schemes_by_domain[category_selected])
    
    # ~60% applied = Yes, 40% applied = No
    applied = "Yes" if random.random() < 0.6 else "No"
    
    # Only possible if applied = Yes, probability ~65%
    if applied == "Yes":
        approved = "Yes" if random.random() < 0.65 else "No"
    else:
        approved = "No"
    
    income_band = random.choice(["Low", "Middle", "High"])
    age_group = random.choice(["18-25", "26-40", "41-60", "60+"])
    
    # Random timestamp within last 12 months
    random_timestamp = start_date + timedelta(
        seconds=random.randint(0, int((end_date - start_date).total_seconds()))
    )
    timestamp = random_timestamp.strftime("%Y-%m-%d %H:%M:%S")
    
    records.append({
        "user_id": user_id,
        "state": state,
        "district": district,
        "category_selected": category_selected,
        "scheme_shown": scheme_shown,
        "applied": applied,
        "approved": approved,
        "income_band": income_band,
        "age_group": age_group,
        "timestamp": timestamp
    })

# Write to CSV
output_file = 'public/government_usage_dataset.csv'
with open(output_file, 'w', newline='', encoding='utf-8') as f:
    fieldnames = [
        "user_id", "state", "district", "category_selected", "scheme_shown",
        "applied", "approved", "income_band", "age_group", "timestamp"
    ]
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(records)

print(f"\nGenerated {len(records)} records to {output_file}")

# Print statistics
applied_yes = sum(1 for r in records if r['applied'] == 'Yes')
approved_count = sum(1 for r in records if r['approved'] == 'Yes')
approved_given_applied = sum(1 for r in records if r['applied'] == 'Yes' and r['approved'] == 'Yes')

print(f"\nDataset Statistics:")
print(f"  Total records: {len(records)}")
print(f"  Applied (Yes): {applied_yes} ({100*applied_yes/len(records):.1f}%)")
print(f"  Approved: {approved_count} ({100*approved_count/len(records):.1f}%)")
print(f"  Approved (given Applied=Yes): {approved_given_applied} ({100*approved_given_applied/applied_yes:.1f}%)")
print(f"  States: {len(STATE_DISTRICTS)}")
print(f"  Domains: {len(domains)}")
print(f"  Total schemes: {sum(len(v) for v in schemes_by_domain.values())}")
