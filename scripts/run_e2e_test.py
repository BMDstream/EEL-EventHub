#!/usr/bin/env python3
"""
CLI E2E Test Suite for EventHub / EEL Logistics
Runs full end-to-end event lifecycle verification.

Usage:
    python scripts/run_e2e_test.py
    python scripts/run_e2e_test.py --json
    python scripts/run_e2e_test.py --api-url https://eventhub-preview.vercel.app --token <JWT>
"""

import os
import sys
import argparse
import json
import time

# Ensure project root is in python path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Force unbuffered output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)


class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"


def print_banner():
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*72}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}       EVENTHUB AUTOMATED END-TO-END (E2E) SYSTEM TEST SUITE{Colors.RESET}")
    print(f"{Colors.DIM}  Validates Event Creation, Form Studio, Registrations, Check-In, Reports{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*72}{Colors.RESET}\n")


def run_local_e2e(quiet: bool = False):
    from backend.e2e_service import E2ETestRunner
    runner = E2ETestRunner()
    
    stages_definition = [
        (1, "System Baseline & Database Health", runner.stage_01_baseline),
        (2, "Event Creation From Scratch", runner.stage_02_create_event),
        (3, "Form Studio Custom Questions Schema", runner.stage_03_form_studio_questions),
        (4, "Public Registrations & Custom Answers", runner.stage_04_public_registrations),
        (5, "Individual Registrant Management", runner.stage_05_individual_management),
        (6, "Bulk Upload & Matching Persistence", runner.stage_06_bulk_upload),
        (7, "Bulk Registrant Actions", runner.stage_07_bulk_actions),
        (8, "Event Day Attendance & Door Check-In", runner.stage_08_attendance_checkin),
        (9, "QR Code Generation & ZIP Archive Download", runner.stage_09_qrcode_zip),
        (10, "Email Template Rendering & Branding", runner.stage_10_email_template_rendering),
        (11, "Client View Link & Public Stats Synchronization", runner.stage_11_client_view_and_public_stats),
        (12, "Presentation Report & Master Excel Export", runner.stage_12_presentation_and_excel),
        (13, "Safe Teardown & Foreign Key Integrity", runner.stage_13_safe_cleanup),
    ]

    total_start = time.perf_counter()

    for num, name, func in stages_definition:
        if not quiet:
            sys.stdout.write(f"{Colors.DIM}[{num:02d}/13]{Colors.RESET} {Colors.BOLD}{name}{Colors.RESET} ... ")
            sys.stdout.flush()
        
        stage_res = runner.run_stage(num, name, func)
        status = stage_res["status"]
        duration = stage_res["duration_ms"]
        
        if not quiet:
            if status == "passed":
                print(f"{Colors.GREEN}✔ PASSED{Colors.RESET} {Colors.DIM}({duration}ms){Colors.RESET}")
                print(f"       {Colors.DIM}↳ {stage_res['details']}{Colors.RESET}")
            else:
                print(f"{Colors.RED}✖ FAILED{Colors.RESET} {Colors.DIM}({duration}ms){Colors.RESET}")
                print(f"       {Colors.RED}↳ {stage_res.get('error', 'Stage failed')}{Colors.RESET}")
        
        if status != "passed":
            if num < 13:
                if not quiet:
                    print(f"       {Colors.YELLOW}Executing safe cleanup teardown...{Colors.RESET}")
                try:
                    runner.stage_13_safe_cleanup()
                except Exception as ce:
                    if not quiet:
                        print(f"       {Colors.RED}Teardown error: {ce}{Colors.RESET}")
            break

    total_duration_ms = round((time.perf_counter() - total_start) * 1000, 2)
    passed_count = sum(1 for s in runner.stages if s["status"] == "passed")
    failed_count = sum(1 for s in runner.stages if s["status"] == "failed")
    overall_status = "passed" if (failed_count == 0 and passed_count == len(stages_definition)) else "failed"

    return {
        "run_id": runner.run_id,
        "overall_status": overall_status,
        "total_stages": len(stages_definition),
        "passed_stages": passed_count,
        "failed_stages": failed_count,
        "total_duration_ms": total_duration_ms,
        "stages": runner.stages
    }


def run_remote_e2e(api_url: str, token: str = None):
    import urllib.request
    import urllib.error

    endpoint = f"{api_url.rstrip('/')}/api/py/settings/run-e2e-test"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        headers["x-user-email"] = "admin@eelogistics.co.za"

    req = urllib.request.Request(endpoint, data=b"{}", headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode())
            return data
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode()
        print(f"{Colors.RED}HTTP Error {e.code}: {err_msg}{Colors.RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"{Colors.RED}Connection error: {e}{Colors.RESET}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="EventHub E2E Test Suite Runner")
    parser.add_argument("--json", action="store_true", help="Output results in JSON format")
    parser.add_argument("--api-url", type=str, help="Run against remote deployment API URL")
    parser.add_argument("--token", type=str, help="Authentication token for remote API")
    args = parser.parse_args()

    if not args.json:
        print_banner()

    if args.api_url:
        if not args.json:
            print(f"{Colors.BLUE}Targeting remote environment:{Colors.RESET} {args.api_url}")
        results = run_remote_e2e(args.api_url, args.token)
    else:
        results = run_local_e2e(quiet=args.json)

    if args.json:
        print(json.dumps(results, indent=2))
        sys.exit(0 if results.get("overall_status") == "passed" else 1)

    print(f"\n{Colors.BOLD}{'='*72}{Colors.RESET}")
    if results.get("overall_status") == "passed":
        print(f"{Colors.GREEN}{Colors.BOLD}🎉 ALL {results['total_stages']} E2E STAGES PASSED SUCCESSFULLY in {results['total_duration_ms']}ms!{Colors.RESET}")
    else:
        print(f"{Colors.RED}{Colors.BOLD}❌ E2E TEST SUITE COMPLETED WITH FAILURES: {results.get('passed_stages', 0)}/{results.get('total_stages', 13)} Passed.{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*72}{Colors.RESET}\n")

    sys.exit(0 if results.get("overall_status") == "passed" else 1)


if __name__ == "__main__":
    main()
