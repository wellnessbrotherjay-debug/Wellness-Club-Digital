
import json
from datetime import datetime

threshold_date = datetime.fromisoformat("2026-02-04T00:00:00.000Z".replace("Z", "+00:00"))

def should_delete(entry):
    created_at_str = entry.get("created_at", "")
    if not created_at_str:
        return True
    
    try:
        created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
    except ValueError:
        return True
        
    if created_at < threshold_date:
        return True
        
    guest_name = entry.get("guestName", "").lower()
    test_substrings = ["jay", "sammy", "kimmy", "test"]
    # Also user said "J" or Sammy or Kimmy. "jay" is covered.
    
    for sub in test_substrings:
        if sub in guest_name:
            return True
            
    return False

def clean_file(filepath):
    print(f"Cleaning {filepath}...")
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    initial_count = len(data)
    cleaned_data = [entry for entry in data if not should_delete(entry)]
    final_count = len(cleaned_data)
    
    print(f"  {initial_count} -> {final_count} entries")
    
    with open(filepath, 'w') as f:
        json.dump(cleaned_data, f, indent=2)

clean_file("/Users/jaydengle/Wellness-Club-Digital/redeemed_vouchers.json")
clean_file("/Users/jaydengle/Wellness-Club-Digital/vouchers_debug.json")
