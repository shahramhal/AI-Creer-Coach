# test_matcher.py
"""
Test script for job matching endpoint
"""

import requests
import json


ML_SERVICE_URL = "http://localhost:8000"

def test_job_matching():
    """Test the job matching endpoint"""
    
    # Sample CV text
    cv_text = input("Enter sample CV text (or paste a CV excerpt):\n")
    
    try :
        cv_text = cv_text.encode('utf-8').decode('unicode_escape')
    except :
        pass
    
    # Sample jobs
    jobs = [
        {
            "job_id": "1",
            "source": "reed",
            "title": "Senior Python Developer",
            "company": "Amazing Tech Ltd",
            "location": "London, UK",
            "description": "We need a Senior Python Developer with Django, PostgreSQL, and Docker. You'll build microservices and REST APIs.",
            "requirements": ["Python", "Django", "PostgreSQL", "Docker", "REST APIs"],
            "salary_min": 70000,
            "salary_max": 90000,
            "source_url": "https://example.com/job1",
            "posted_date": "2026-01-20"
        },
        {
            "job_id": "2",
            "source": "adzuna",
            "title": "Python Engineer",
            "company": "DataCorp",
            "location": "Manchester, UK",
            "description": "Python engineer for data pipelines. Need Python, pandas, SQL, and cloud experience.",
            "requirements": ["Python", "pandas", "SQL", "AWS"],
            "salary_min": 60000,
            "salary_max": 75000,
            "source_url": "https://example.com/job2",
            "posted_date": "2026-01-21"
        },
        {
            "job_id": "3",
            "source": "reed",
            "title": "Java Backend Developer",
            "company": "Enterprise Solutions",
            "location": "Birmingham, UK",
            "description": "Java developer with Spring Boot and microservices. No Python required.",
            "requirements": ["Java", "Spring Boot", "MySQL", "Microservices"],
            "salary_min": 65000,
            "salary_max": 85000,
            "source_url": "https://example.com/job3",
            "posted_date": "2026-01-19"
        }
    ]
    
    # Prepare request
    payload = {
        "cv_text": cv_text,
        "jobs": jobs,
        "top_k": 10
    }
    
    print("=" * 70)
    print("TESTING JOB MATCHING ENDPOINT")
    print("=" * 70)
    print(f"\nSending request to: {ML_SERVICE_URL}/api/ml/match-jobs")
    print(f"CV Text: {cv_text[:100]}...")
    print(f"Number of jobs: {len(jobs)}")
    print("\n" + "=" * 70)
    
    # Make request
    try:
        response = requests.post(
            f"{ML_SERVICE_URL}/api/ml/match-jobs",
            json=payload,
            timeout=30
        )
        
        response.raise_for_status()
        result = response.json()
        
        # Display results
        print("\n SUCCESS!")
        print("=" * 70)
        print(f"Total jobs analyzed: {result['total_analyzed']}")
        print(f"Matched jobs returned: {len(result['matched_jobs'])}")
        print("\n" + "=" * 70)
        print("MATCHED JOBS (Ranked by Score):")
        print("=" * 70)
        
        for i, job in enumerate(result['matched_jobs'], 1):
            print(f"\n{i}. {job['title']} at {job['company']}")
            print(f"   Location: {job['location']}")
            print(f"   Match Score: {job['match_score']:.1f}%")
            print(f"   Salary: £{job['salary_min']:,} - £{job['salary_max']:,}")
            
            breakdown = job['match_breakdown']
            print(f"   Skill Coverage: {breakdown['skill_coverage']:.1f}%")
            
            if breakdown['matched_skills']:
                print(f"    Matched Skills: {', '.join(breakdown['matched_skills'])}")
            
            if breakdown['missing_skills']:
                print(f"   ❌ Missing Skills: {', '.join(breakdown['missing_skills'])}")
        
        print("\n" + "=" * 70)
        print("TEST COMPLETED SUCCESSFULLY")
        print("=" * 70)
        
        # Verify expected behavior
        print("\n📊 VERIFICATION:")
        if len(result['matched_jobs']) > 0:
            top_job = result['matched_jobs'][0]
            print(f" Top match: {top_job['title']} ({top_job['match_score']:.1f}%)")
            
            if "Python" in top_job['title']:
                print(" Top match is a Python job (as expected)")
            else:
                print("⚠️  Top match is NOT a Python job (unexpected)")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to ML service")
        print(f"   Make sure it's running on {ML_SERVICE_URL}")
        return False
        
    except requests.exceptions.HTTPError as e:
        print(f"\n❌ HTTP ERROR: {e}")
        print(f"Response: {response.text}")
        return False
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        return False


if __name__ == "__main__":
    test_job_matching()