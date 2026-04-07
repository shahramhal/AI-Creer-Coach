"""
Enhanced test script for production CV parser
Shows detailed parsing results for debugging and validation
"""

from cv_parser.parser import CVParser
import json
import sys

def print_separator(title):
    """Print section separator"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_parser():
    """Test CV parser with detailed output"""
    
    # Initialize parser
    parser = CVParser()
    
    # Read test PDF
    with open("Shahram_Halimzoda_Software_Engineer.pdf", "rb") as f:
        content = f.read()
    
    # Parse the CV
    result = parser.parse(content, "Shahram_Halimzoda_Software_Engineer.pdf")
    
    # === BASIC INFO ===
    print_separator("PARSING RESULTS")
    print(f"✓ Filename: {result['filename']}")
    print(f"✓ Parsed at: {result['parsed_at']}")
    print(f"✓ Raw text length: {len(result.get('raw_text', ''))} characters")
    
    # === CONTACT INFO ===
    print_separator("CONTACT INFORMATION")
    if 'contact_info' in result:
        contact = result['contact_info']
        print(f"Name:     {contact.get('name', 'Not found')}")
        print(f"Email:    {contact.get('email', 'Not found')}")
        print(f"Phone:    {contact.get('phone', 'Not found')}")
        print(f"Location: {contact.get('location', 'Not found')}")
    else:
        print("❌ No contact information found")
    
    # === EXPERIENCE ===
    print_separator("WORK EXPERIENCE")
    if 'experience' in result and result['experience']:
        print(f" Found {len(result['experience'])} position(s)\n")
        
        for i, exp in enumerate(result['experience'], 1):
            print(f"Position {i}:")
            print(f"  Title:    {exp.get('title', 'N/A')}")
            print(f"  Company:  {exp.get('company', 'N/A')}")
            print(f"  Location: {exp.get('location', 'N/A')}")
            print(f"  Dates:    {exp.get('dates', 'N/A')}")
            
            # Show responsibilities
            if 'responsibilities' in exp and exp['responsibilities']:
                print(f"  Responsibilities ({len(exp['responsibilities'])}):")
                for j, resp in enumerate(exp['responsibilities'][:3], 1):  # Show first 3
                    print(f"    {j}. {resp[:80]}{'...' if len(resp) > 80 else ''}")
            print()
    else:
        print("❌ No work experience found")
    
    # === EDUCATION ===
    print_separator("EDUCATION")
    if 'education' in result and result['education']:
        print(f" Found {len(result['education'])} education entry(ies)\n")
        
        for i, edu in enumerate(result['education'], 1):
            print(f"Education {i}:")
            print(f"  Degree:      {edu.get('degree', 'N/A')}")
            print(f"  Field:       {edu.get('field', 'N/A')}")
            print(f"  Institution: {edu.get('institution', 'N/A')}")
            print(f"  Location:    {edu.get('location', 'N/A')}")
            print(f"  Dates:       {edu.get('dates', 'N/A')}")
            print()
    else:
        print("❌ No education found")
    
    # === SKILLS ===
    print_separator("SKILLS")
    if 'skills' in result and result['skills']:
        print(f" Found {len(result['skills'])} skill(s)\n")
        
        # Group skills by category for better display
        skills = result['skills']
        
        # Display in columns
        skills_per_row = 4
        for i in range(0, len(skills), skills_per_row):
            row_skills = skills[i:i+skills_per_row]
            print("  " + " | ".join(f"{skill:<15}" for skill in row_skills))
    else:
        print("❌ No skills found")
    
    # === SUMMARY ===
    print_separator("PROFESSIONAL SUMMARY")
    if 'summary' in result and result['summary']:
        summary = result['summary']
        # Truncate if too long
        if len(summary) > 200:
            print(f"{summary[:200]}...")
        else:
            print(summary)
    else:
        print("❌ No summary found")
    
    # === VALIDATION ===
    print_separator("VALIDATION CHECKS")
    
    checks = {
        'Contact info extracted': bool(result.get('contact_info')),
        'Name found': bool(result.get('contact_info', {}).get('name')),
        'Email found': bool(result.get('contact_info', {}).get('email')),
        'Experience found': len(result.get('experience', [])) > 0,
        'Multiple jobs found': len(result.get('experience', [])) >= 2,
        'Education found': len(result.get('education', [])) > 0,
        'Multiple education entries': len(result.get('education', [])) >= 2,
        'Skills found': len(result.get('skills', [])) > 0,
    }
    
    passed = sum(checks.values())
    total = len(checks)
    
    for check, status in checks.items():
        icon = "" if status else "❌"
        print(f"{icon} {check}")
    
    print(f"\nValidation Score: {passed}/{total} ({int(passed/total*100)}%)")
    
    # === EXPORT JSON ===
    print_separator("DATA EXPORT")
    
    # Remove raw_text for cleaner JSON
    export_data = {k: v for k, v in result.items() if k != 'raw_text'}
    
    json_output = json.dumps(export_data, indent=2)
    print("JSON Output (first 500 chars):")
    print(json_output[:500] + "..." if len(json_output) > 500 else json_output)
    
    # Save to file
    with open('parsed_cv.json', 'w') as f:
        json.dump(export_data, f, indent=2)
    print(f"\n Full data saved to: parsed_cv.json")
    
    return result, passed == total

if __name__ == "__main__":
    try:
        result, all_passed = test_parser()
        
        print_separator("TEST SUMMARY")
        if all_passed:
            print("🎉 ALL TESTS PASSED!")
            sys.exit(0)
        else:
            print("⚠️  SOME TESTS FAILED - Check validation section above")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ TEST FAILED WITH ERROR:")
        print(f"   {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)