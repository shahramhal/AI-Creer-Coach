"""
Comprehensive CV Parser Testing Script
Tests parser on Kaggle resume dataset and generates detailed metrics
"""

import os
import sys
import glob
import json
import time
from pathlib import Path
from datetime import datetime
from collections import defaultdict
import kagglehub

# Add parser to path (adjust if needed)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cv_parser.parser import CVParser


class ParserTester:
    """
    Comprehensive testing framework for CV parser
    """
    
    def __init__(self, parser, dataset_path):
        self.parser = parser
        self.dataset_path = dataset_path
        self.results = {
            'total_tested': 0,
            'successful_parses': 0,
            'failed_parses': 0,
            'by_category': {},
            'metrics': {
                'avg_skills_per_cv': 0,
                'avg_experience_per_cv': 0,
                'avg_education_per_cv': 0,
                'email_extraction_rate': 0,
                'name_extraction_rate': 0,
                'phone_extraction_rate': 0,
                'avg_parsing_time': 0,
            },
            'failures': [],
            'warnings': []
        }
        
        self.total_skills = 0
        self.total_experience = 0
        self.total_education = 0
        self.total_emails = 0
        self.total_names = 0
        self.total_phones = 0
        self.total_time = 0
    
    def test_single_cv(self, pdf_path, category):
        """Test parser on single CV"""
        try:
            start_time = time.time()
            
            # Read file
            with open(pdf_path, 'rb') as f:
                content = f.read()
            
            # Parse
            result = self.parser.parse(content, os.path.basename(pdf_path))
            
            # Record time
            parse_time = time.time() - start_time
            self.total_time += parse_time
            
            # Extract metrics
            skills_count = len(result.get('skills', []))
            exp_count = len(result.get('experience', []))
            edu_count = len(result.get('education', []))
            
            contact = result.get('contact_info', {})
            has_email = bool(contact.get('email'))
            has_name = bool(contact.get('name'))
            has_phone = bool(contact.get('phone'))
            
            # Update totals
            self.total_skills += skills_count
            self.total_experience += exp_count
            self.total_education += edu_count
            if has_email:
                self.total_emails += 1
            if has_name:
                self.total_names += 1
            if has_phone:
                self.total_phones += 1
            
            # Check for warnings
            warnings = []
            if skills_count == 0:
                warnings.append('No skills extracted')
            if exp_count == 0:
                warnings.append('No experience extracted')
            if not has_email and not has_phone:
                warnings.append('No contact info')
            
            return {
                'success': True,
                'file': os.path.basename(pdf_path),
                'category': category,
                'skills': skills_count,
                'experience': exp_count,
                'education': edu_count,
                'has_email': has_email,
                'has_name': has_name,
                'has_phone': has_phone,
                'parse_time': parse_time,
                'warnings': warnings
            }
            
        except Exception as e:
            return {
                'success': False,
                'file': os.path.basename(pdf_path),
                'category': category,
                'error': str(e)
            }
    
    def test_category(self, category, max_cvs=None):
        """Test all CVs in a category"""
        print(f"\n{'='*70}")
        print(f"Testing Category: {category}")
        print(f"{'='*70}")
        
        # Find PDFs
        category_path = os.path.join(self.dataset_path, 'data', 'data', category)
        if not os.path.exists(category_path):
            print(f"⚠️  Category path not found: {category_path}")
            return
        
        pdf_files = glob.glob(os.path.join(category_path, '*.pdf'))
        
        if max_cvs:
            pdf_files = pdf_files[:max_cvs]
        
        print(f"Found {len(pdf_files)} PDFs")
        
        # Initialize category results
        self.results['by_category'][category] = {
            'total': len(pdf_files),
            'successful': 0,
            'failed': 0,
            'avg_skills': 0,
            'avg_experience': 0,
            'avg_education': 0,
            'warnings': []
        }
        
        # Test each CV
        category_skills = 0
        category_exp = 0
        category_edu = 0
        
        for i, pdf_path in enumerate(pdf_files, 1):
            # Progress indicator
            if i % 10 == 0 or i == len(pdf_files):
                print(f"   Progress: {i}/{len(pdf_files)}", end='\r')
            
            result = self.test_single_cv(pdf_path, category)
            
            self.results['total_tested'] += 1
            
            if result['success']:
                self.results['successful_parses'] += 1
                self.results['by_category'][category]['successful'] += 1
                
                category_skills += result['skills']
                category_exp += result['experience']
                category_edu += result['education']
                
                # Record warnings
                if result['warnings']:
                    self.results['warnings'].append({
                        'file': result['file'],
                        'category': category,
                        'warnings': result['warnings']
                    })
            else:
                self.results['failed_parses'] += 1
                self.results['by_category'][category]['failed'] += 1
                self.results['failures'].append({
                    'file': result['file'],
                    'category': category,
                    'error': result['error']
                })
        
        # Calculate category averages
        successful = self.results['by_category'][category]['successful']
        if successful > 0:
            self.results['by_category'][category]['avg_skills'] = round(category_skills / successful, 1)
            self.results['by_category'][category]['avg_experience'] = round(category_exp / successful, 1)
            self.results['by_category'][category]['avg_education'] = round(category_edu / successful, 1)
        
        print(f"\n Category complete: {successful} successful, {self.results['by_category'][category]['failed']} failed")
    
    def test_multiple_categories(self, categories, cvs_per_category=20):
        """Test multiple categories"""
     
        print("COMPREHENSIVE CV PARSER TESTING")
     
        print(f"\nTesting {len(categories)} categories, {cvs_per_category} CVs each")
        print(f"Total CVs to test: {len(categories) * cvs_per_category}")
        
        start_time = time.time()
        
        for category in categories:
            self.test_category(category, max_cvs=cvs_per_category)
        
        # Calculate final metrics
        self._calculate_final_metrics()
        
        # Generate report
        total_time = time.time() - start_time
        self._generate_report(total_time)
    
    def _calculate_final_metrics(self):
        """Calculate aggregate metrics"""
        successful = self.results['successful_parses']
        
        if successful > 0:
            self.results['metrics']['avg_skills_per_cv'] = round(self.total_skills / successful, 1)
            self.results['metrics']['avg_experience_per_cv'] = round(self.total_experience / successful, 1)
            self.results['metrics']['avg_education_per_cv'] = round(self.total_education / successful, 1)
            self.results['metrics']['email_extraction_rate'] = round(self.total_emails / successful, 2)
            self.results['metrics']['name_extraction_rate'] = round(self.total_names / successful, 2)
            self.results['metrics']['phone_extraction_rate'] = round(self.total_phones / successful, 2)
            self.results['metrics']['avg_parsing_time'] = round(self.total_time / successful, 2)
    
    def _generate_report(self, total_time):
        """Generate comprehensive test report"""
        print(f"\n\n{'='*70}")
        print("TEST RESULTS SUMMARY")
        print(f"{'='*70}")
        
        # Overall stats
        print(f"\n📊 OVERALL STATISTICS:")
        print(f"   Total CVs Tested:     {self.results['total_tested']}")
        print(f"   Successful Parses:    {self.results['successful_parses']} ({self.results['successful_parses']/self.results['total_tested']*100:.1f}%)")
        print(f"   Failed Parses:        {self.results['failed_parses']} ({self.results['failed_parses']/self.results['total_tested']*100:.1f}%)")
        print(f"   Total Time:           {total_time:.1f} seconds")
        print(f"   Avg Time per CV:      {self.results['metrics']['avg_parsing_time']:.2f} seconds")
        
        # Key metrics
        metrics = self.results['metrics']
        print(f"\n🎯 KEY METRICS:")
        print(f"   Avg Skills/CV:        {metrics['avg_skills_per_cv']} (Target: >10)")
        print(f"   Avg Experience/CV:    {metrics['avg_experience_per_cv']} (Target: >2)")
        print(f"   Avg Education/CV:     {metrics['avg_education_per_cv']}")
        print(f"   Email Extraction:     {metrics['email_extraction_rate']*100:.0f}% (Target: >70%)")
        print(f"   Name Extraction:      {metrics['name_extraction_rate']*100:.0f}% (Target: >60%)")
        print(f"   Phone Extraction:     {metrics['phone_extraction_rate']*100:.0f}%")
        
        # Category breakdown
        print(f"\n📁 BY CATEGORY:")
        print(f"{'Category':<25} {'Success':<10} {'Skills':<10} {'Exp':<10} {'Edu':<10}")
        print("-" * 70)
        
        for category, stats in self.results['by_category'].items():
            success_rate = stats['successful'] / stats['total'] * 100 if stats['total'] > 0 else 0
            print(f"{category:<25} {success_rate:>6.1f}%   "
                  f"{stats['avg_skills']:>6.1f}    "
                  f"{stats['avg_experience']:>6.1f}    "
                  f"{stats['avg_education']:>6.1f}")
        
        # Warnings
        if self.results['warnings']:
            print(f"\n⚠️  WARNINGS: {len(self.results['warnings'])} CVs with issues")
            warning_types = defaultdict(int)
            for w in self.results['warnings']:
                for warning in w['warnings']:
                    warning_types[warning] += 1
            
            for warning, count in sorted(warning_types.items(), key=lambda x: x[1], reverse=True):
                print(f"   • {warning}: {count} CVs")
        
        # Failures
        if self.results['failures']:
            print(f"\n❌ FAILURES: {len(self.results['failures'])} CVs failed to parse")
            error_types = defaultdict(int)
            for f in self.results['failures']:
                error_types[f['error'][:50]] += 1
            
            for error, count in sorted(error_types.items(), key=lambda x: x[1], reverse=True)[:5]:
                print(f"   • {error}...: {count} CVs")
        
        # Evaluation
        print(f"\n{'='*70}")
        print("EVALUATION")
        print(f"{'='*70}")
        
        # Check against targets
        targets_met = []
        targets_missed = []
        
        if metrics['avg_skills_per_cv'] >= 10:
            targets_met.append(" Skills extraction (>10)")
        else:
            targets_missed.append(f"❌ Skills extraction ({metrics['avg_skills_per_cv']:.1f} < 10)")
        
        if metrics['avg_experience_per_cv'] >= 2:
            targets_met.append(" Experience extraction (>2)")
        else:
            targets_missed.append(f"❌ Experience extraction ({metrics['avg_experience_per_cv']:.1f} < 2)")
        
        if metrics['email_extraction_rate'] >= 0.70:
            targets_met.append(" Email extraction (>70%)")
        else:
            targets_missed.append(f"❌ Email extraction ({metrics['email_extraction_rate']*100:.0f}% < 70%)")
        
        if metrics['name_extraction_rate'] >= 0.60:
            targets_met.append(" Name extraction (>60%)")
        else:
            targets_missed.append(f"⚠️  Name extraction ({metrics['name_extraction_rate']*100:.0f}% < 60%)")
        
        parse_success_rate = self.results['successful_parses'] / self.results['total_tested']
        if parse_success_rate >= 0.95:
            targets_met.append(" Parsing success rate (>95%)")
        else:
            targets_missed.append(f"❌ Parsing success rate ({parse_success_rate*100:.0f}% < 95%)")
        
        print("\n TARGETS MET:")
        for target in targets_met:
            print(f"   {target}")
        
        if targets_missed:
            print("\n❌ TARGETS MISSED:")
            for target in targets_missed:
                print(f"   {target}")
        
        # Overall assessment
        print(f"\n{'='*70}")
        if len(targets_missed) == 0:
            print("🎉 EXCELLENT! All targets met. Parser is production-ready.")
        elif len(targets_missed) <= 2:
            print(" GOOD! Most targets met. Minor improvements needed.")
        else:
            print("⚠️  NEEDS IMPROVEMENT. Several targets missed.")
        print(f"{'='*70}")
        
        # Save results
        self._save_results()
    
    def _save_results(self):
        """Save results to JSON file"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = f'test_results_{timestamp}.json'
        
        with open(output_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n💾 Results saved to: {output_file}")


def main():
    """Main testing function"""
 
    print("CV PARSER - COMPREHENSIVE TESTING")
 
    
    # Download dataset
    print("\n📥 Downloading dataset...")
    try:
        dataset_path = kagglehub.dataset_download("snehaanbhawal/resume-dataset")
        print(f" Dataset downloaded: {dataset_path}")
    except Exception as e:
        print(f"❌ Failed to download dataset: {e}")
        print("\nAlternative: Set dataset_path manually if you have it locally")
        return
    
    # Initialize parser
    print("\n🔧 Initializing parser...")
    try:
        parser = CVParser()
        print(" Parser initialized")
        
        # Check if spaCy loaded
        if parser.nlp:
            print("    spaCy NER enabled")
        else:
            print("   ⚠️  spaCy not loaded (reduced accuracy)")
    except Exception as e:
        print(f"❌ Failed to initialize parser: {e}")
        return
    
    # Initialize tester
    tester = ParserTester(parser, dataset_path)
    
    # Define test categories (you can modify this)
    test_categories = [
        'CHEF',
        'AGRICULTURE', 
        'BANKING',
        'BPO',
        'ACCOUNTANT',
        'ADVOCATE',
        'IT',  # If exists
        'BUSINESS-DEVELOPMENT'
    ]
    
    # Test configuration
    cvs_per_category = 20  # Adjust based on how many you want to test
    
    # Run tests
    tester.test_multiple_categories(test_categories, cvs_per_category)


if __name__ == "__main__":
    main()