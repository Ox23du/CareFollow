#!/usr/bin/env python3
"""
CareFollow Backend API Testing Suite
Tests all endpoints for the medical post-care system
"""

import requests
import sys
import json
from datetime import datetime, timedelta
import time

class CareFollowAPITester:
    def __init__(self, base_url="https://care-followup.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.staff_token = None
        self.patient_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_ids = {
            'patient_id': None,
            'appointment_id': None,
            'instruction_id': None,
            'reminder_id': None,
            'followup_id': None
        }

    def log_test(self, name, success, details="", endpoint=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "endpoint": endpoint
        })

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            response_data = {}
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            return success, response.status_code, response_data

        except requests.exceptions.Timeout:
            return False, 0, {"error": "Request timeout"}
        except requests.exceptions.ConnectionError:
            return False, 0, {"error": "Connection error"}
        except Exception as e:
            return False, 0, {"error": str(e)}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, status, data = self.make_request('GET', '')
        self.log_test("Root API endpoint", success, f"Status: {status}", "/")
        return success

    def test_staff_registration(self):
        """Test staff user registration"""
        staff_data = {
            "email": f"staff_test_{int(time.time())}@test.com",
            "password": "TestPass123!",
            "name": "Dr. Test Staff",
            "role": "staff",
            "phone": "+5511999999999"
        }
        
        success, status, data = self.make_request('POST', 'auth/register', staff_data, expected_status=200)
        if success and 'access_token' in data:
            self.staff_token = data['access_token']
            self.log_test("Staff registration", True, f"Token received", "auth/register")
        else:
            self.log_test("Staff registration", False, f"Status: {status}, Data: {data}", "auth/register")
        return success

    def test_patient_registration(self):
        """Test patient user registration"""
        patient_data = {
            "email": f"patient_test_{int(time.time())}@test.com",
            "password": "TestPass123!",
            "name": "Patient Test",
            "role": "patient",
            "phone": "+5511888888888"
        }
        
        success, status, data = self.make_request('POST', 'auth/register', patient_data, expected_status=200)
        if success and 'access_token' in data:
            self.patient_token = data['access_token']
            self.log_test("Patient registration", True, f"Token received", "auth/register")
        else:
            self.log_test("Patient registration", False, f"Status: {status}, Data: {data}", "auth/register")
        return success

    def test_auth_me(self):
        """Test auth/me endpoint"""
        if not self.staff_token:
            self.log_test("Auth me endpoint", False, "No staff token available", "auth/me")
            return False
            
        success, status, data = self.make_request('GET', 'auth/me', token=self.staff_token)
        self.log_test("Auth me endpoint", success, f"Status: {status}", "auth/me")
        return success

    def test_create_patient(self):
        """Test patient creation by staff"""
        if not self.staff_token:
            self.log_test("Create patient", False, "No staff token available", "patients")
            return False

        patient_data = {
            "name": "João Silva",
            "email": f"joao_test_{int(time.time())}@test.com",
            "phone": "+5511777777777",
            "birth_date": "1990-01-15",
            "notes": "Paciente teste para orientações"
        }
        
        success, status, data = self.make_request('POST', 'patients', patient_data, self.staff_token, expected_status=200)
        if success and 'patient_id' in data:
            self.created_ids['patient_id'] = data['patient_id']
            self.log_test("Create patient", True, f"Patient ID: {data['patient_id']}", "patients")
        else:
            self.log_test("Create patient", False, f"Status: {status}, Data: {data}", "patients")
        return success

    def test_list_patients(self):
        """Test listing patients"""
        if not self.staff_token:
            self.log_test("List patients", False, "No staff token available", "patients")
            return False

        success, status, data = self.make_request('GET', 'patients', token=self.staff_token)
        self.log_test("List patients", success and isinstance(data, list), f"Status: {status}, Count: {len(data) if isinstance(data, list) else 0}", "patients")
        return success

    def test_create_appointment(self):
        """Test appointment creation"""
        if not self.staff_token or not self.created_ids['patient_id']:
            self.log_test("Create appointment", False, "Missing staff token or patient ID", "appointments")
            return False

        appointment_data = {
            "patient_id": self.created_ids['patient_id'],
            "procedure": "Consulta de rotina",
            "diagnosis": "Hipertensão arterial",
            "notes": "Paciente apresenta pressão elevada",
            "appointment_date": datetime.now().isoformat()
        }
        
        success, status, data = self.make_request('POST', 'appointments', appointment_data, self.staff_token, expected_status=200)
        if success and 'appointment_id' in data:
            self.created_ids['appointment_id'] = data['appointment_id']
            self.log_test("Create appointment", True, f"Appointment ID: {data['appointment_id']}", "appointments")
        else:
            self.log_test("Create appointment", False, f"Status: {status}, Data: {data}", "appointments")
        return success

    def test_list_appointments(self):
        """Test listing appointments"""
        if not self.staff_token:
            self.log_test("List appointments", False, "No staff token available", "appointments")
            return False

        success, status, data = self.make_request('GET', 'appointments', token=self.staff_token)
        self.log_test("List appointments", success and isinstance(data, list), f"Status: {status}, Count: {len(data) if isinstance(data, list) else 0}", "appointments")
        return success

    def test_generate_ai_instructions(self):
        """Test AI instruction generation with OpenAI GPT-5.2"""
        if not self.staff_token or not self.created_ids['appointment_id']:
            self.log_test("Generate AI instructions", False, "Missing staff token or appointment ID", "instructions/generate")
            return False

        instruction_data = {
            "appointment_id": self.created_ids['appointment_id'],
            "generate_audio": True
        }
        
        print("🤖 Generating AI instructions (this may take 10-15 seconds)...")
        success, status, data = self.make_request('POST', 'instructions/generate', instruction_data, self.staff_token, expected_status=200)
        
        if success and 'instruction_id' in data:
            self.created_ids['instruction_id'] = data['instruction_id']
            has_text = bool(data.get('text_content'))
            has_audio = bool(data.get('audio_url'))
            self.log_test("Generate AI instructions", True, f"ID: {data['instruction_id']}, Text: {has_text}, Audio: {has_audio}", "instructions/generate")
        else:
            self.log_test("Generate AI instructions", False, f"Status: {status}, Data: {data}", "instructions/generate")
        return success

    def test_list_instructions(self):
        """Test listing instructions"""
        if not self.staff_token:
            self.log_test("List instructions", False, "No staff token available", "instructions")
            return False

        success, status, data = self.make_request('GET', 'instructions', token=self.staff_token)
        self.log_test("List instructions", success and isinstance(data, list), f"Status: {status}, Count: {len(data) if isinstance(data, list) else 0}", "instructions")
        return success

    def test_create_reminder(self):
        """Test reminder creation"""
        if not self.staff_token or not self.created_ids['patient_id']:
            self.log_test("Create reminder", False, "Missing staff token or patient ID", "reminders")
            return False

        reminder_data = {
            "patient_id": self.created_ids['patient_id'],
            "appointment_id": self.created_ids['appointment_id'],
            "message": "Lembre-se de tomar o medicamento às 8h",
            "reminder_type": "email",
            "scheduled_for": (datetime.now() + timedelta(hours=1)).isoformat()
        }
        
        success, status, data = self.make_request('POST', 'reminders', reminder_data, self.staff_token, expected_status=200)
        if success and 'reminder_id' in data:
            self.created_ids['reminder_id'] = data['reminder_id']
            self.log_test("Create reminder", True, f"Reminder ID: {data['reminder_id']}", "reminders")
        else:
            self.log_test("Create reminder", False, f"Status: {status}, Data: {data}", "reminders")
        return success

    def test_list_reminders(self):
        """Test listing reminders"""
        if not self.staff_token:
            self.log_test("List reminders", False, "No staff token available", "reminders")
            return False

        success, status, data = self.make_request('GET', 'reminders', token=self.staff_token)
        self.log_test("List reminders", success and isinstance(data, list), f"Status: {status}, Count: {len(data) if isinstance(data, list) else 0}", "reminders")
        return success

    def test_create_followup(self):
        """Test follow-up creation"""
        if not self.staff_token or not self.created_ids['patient_id']:
            self.log_test("Create follow-up", False, "Missing staff token or patient ID", "followups")
            return False

        followup_data = {
            "patient_id": self.created_ids['patient_id'],
            "appointment_id": self.created_ids['appointment_id'],
            "follow_up_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "reason": "Retorno para verificar pressão arterial",
            "notes": "Verificar se medicação está fazendo efeito"
        }
        
        success, status, data = self.make_request('POST', 'followups', followup_data, self.staff_token, expected_status=200)
        if success and 'followup_id' in data:
            self.created_ids['followup_id'] = data['followup_id']
            self.log_test("Create follow-up", True, f"Follow-up ID: {data['followup_id']}", "followups")
        else:
            self.log_test("Create follow-up", False, f"Status: {status}, Data: {data}", "followups")
        return success

    def test_list_followups(self):
        """Test listing follow-ups"""
        if not self.staff_token:
            self.log_test("List follow-ups", False, "No staff token available", "followups")
            return False

        success, status, data = self.make_request('GET', 'followups', token=self.staff_token)
        self.log_test("List follow-ups", success and isinstance(data, list), f"Status: {status}, Count: {len(data) if isinstance(data, list) else 0}", "followups")
        return success

    def test_complete_followup(self):
        """Test completing a follow-up"""
        if not self.staff_token or not self.created_ids['followup_id']:
            self.log_test("Complete follow-up", False, "Missing staff token or follow-up ID", "followups/complete")
            return False

        success, status, data = self.make_request('PATCH', f"followups/{self.created_ids['followup_id']}/complete", token=self.staff_token)
        self.log_test("Complete follow-up", success, f"Status: {status}", f"followups/{self.created_ids['followup_id']}/complete")
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        if not self.staff_token:
            self.log_test("Dashboard stats", False, "No staff token available", "dashboard/stats")
            return False

        success, status, data = self.make_request('GET', 'dashboard/stats', token=self.staff_token)
        if success:
            required_fields = ['total_patients', 'total_appointments', 'total_instructions', 'pending_followups', 'pending_reminders']
            has_all_fields = all(field in data for field in required_fields)
            self.log_test("Dashboard stats", has_all_fields, f"Status: {status}, Fields: {list(data.keys()) if isinstance(data, dict) else 'Not dict'}", "dashboard/stats")
        else:
            self.log_test("Dashboard stats", False, f"Status: {status}, Data: {data}", "dashboard/stats")
        return success

    def test_patient_portal(self):
        """Test patient portal access"""
        if not self.patient_token:
            self.log_test("Patient portal", False, "No patient token available", "patient/portal")
            return False

        success, status, data = self.make_request('GET', 'patient/portal', token=self.patient_token)
        if success:
            expected_keys = ['patient', 'appointments', 'instructions', 'reminders', 'followups']
            has_all_keys = all(key in data for key in expected_keys)
            self.log_test("Patient portal", has_all_keys, f"Status: {status}, Keys: {list(data.keys()) if isinstance(data, dict) else 'Not dict'}", "patient/portal")
        else:
            self.log_test("Patient portal", False, f"Status: {status}, Data: {data}", "patient/portal")
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🏥 Starting CareFollow Backend API Tests")
        print("=" * 50)
        
        # Basic connectivity
        self.test_root_endpoint()
        
        # Authentication tests
        self.test_staff_registration()
        self.test_patient_registration()
        self.test_auth_me()
        
        # Core functionality tests
        self.test_create_patient()
        self.test_list_patients()
        self.test_create_appointment()
        self.test_list_appointments()
        
        # AI and audio generation (critical feature)
        self.test_generate_ai_instructions()
        self.test_list_instructions()
        
        # Reminders and follow-ups
        self.test_create_reminder()
        self.test_list_reminders()
        self.test_create_followup()
        self.test_list_followups()
        self.test_complete_followup()
        
        # Dashboard and patient portal
        self.test_dashboard_stats()
        self.test_patient_portal()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = CareFollowAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0,
            'test_results': tester.test_results,
            'created_ids': tester.created_ids
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())