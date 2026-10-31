#!/usr/bin/env python
"""Main test runner for AI Agent

This script provides a centralized way to run different test suites.
"""

import sys
import os
import argparse
import subprocess
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


def run_unit_tests():
    """Run unit tests"""
    logger.info("🧪 Running unit tests...")
    cmd = ["pytest", "tests/unit/", "-v"]
    return subprocess.run(cmd, cwd=project_root).returncode


def run_integration_tests():
    """Run integration tests"""
    logger.info("🔗 Running integration tests...")
    cmd = ["pytest", "tests/integration/", "-v"]
    return subprocess.run(cmd, cwd=project_root).returncode


def run_api_tests():
    """Run API tests"""
    logger.info("🌐 Running API tests...")
    cmd = ["pytest", "tests/api/", "-v"]
    return subprocess.run(cmd, cwd=project_root).returncode


def run_all_tests():
    """Run all test suites"""
    logger.info("🚀 Running all tests...")
    cmd = ["pytest", "tests/", "-v", "--tb=short"]
    return subprocess.run(cmd, cwd=project_root).returncode


def run_test_server():
    """Start the server in test mode"""
    logger.info("🖥️  Starting test server...")
    logger.info("Server will be available at http://localhost:8000")
    logger.info("Test endpoints at http://localhost:8000/test/")
    logger.info("API docs at http://localhost:8000/docs")
    
    env = os.environ.copy()
    env["ENVIRONMENT"] = "development"
    
    cmd = ["python", "main.py"]
    return subprocess.run(cmd, cwd=project_root, env=env).returncode


def run_test_scripts(script_name=None):
    """Run test scripts"""
    scripts_dir = project_root / "tests" / "scripts"
    
    if script_name:
        script_path = scripts_dir / f"{script_name}.py"
        if not script_path.exists():
            script_path = scripts_dir / script_name
        
        if script_path.exists():
            logger.info(f"📜 Running test script: {script_path.name}")
            cmd = ["python", str(script_path)]
            return subprocess.run(cmd).returncode
        else:
            logger.error(f"Script not found: {script_name}")
            logger.info(f"Available scripts in {scripts_dir}:")
            for script in scripts_dir.glob("*.py"):
                logger.info(f"  - {script.name}")
            return 1
    else:
        logger.info("📜 Available test scripts:")
        for script in scripts_dir.glob("*.py"):
            logger.info(f"  - {script.name}")
        return 0


def check_environment():
    """Check if test environment is properly configured"""
    logger.info("🔍 Checking test environment...")
    
    issues = []
    
    # Check for required environment variables
    required_vars = ["DATABASE_URL", "OPENAI_API_KEY"]
    optional_vars = ["TAVILY_API_KEY", "GOOGLE_APPLICATION_CREDENTIALS"]
    
    for var in required_vars:
        if not os.getenv(var):
            issues.append(f"Missing required: {var}")
        else:
            logger.info(f"  ✓ {var} is set")
    
    for var in optional_vars:
        if os.getenv(var):
            logger.info(f"  ✓ {var} is set (optional)")
        else:
            logger.info(f"  ⚠ {var} not set (optional)")
    
    # Check for test database
    db_url = os.getenv("TEST_DATABASE_URL")
    if db_url:
        logger.info(f"  ✓ TEST_DATABASE_URL is set")
    else:
        logger.info(f"  ⚠ TEST_DATABASE_URL not set (using main database)")
    
    # Check Python packages
    try:
        import pytest
        logger.info(f"  ✓ pytest installed")
    except ImportError:
        issues.append("pytest not installed (pip install pytest)")
    
    try:
        import pytest_asyncio
        logger.info(f"  ✓ pytest-asyncio installed")
    except ImportError:
        logger.info(f"  ⚠ pytest-asyncio not installed (optional)")
    
    if issues:
        logger.error("\n❌ Environment issues found:")
        for issue in issues:
            logger.error(f"  - {issue}")
        return 1
    else:
        logger.info("\n✅ Environment check passed!")
        return 0


def main():
    parser = argparse.ArgumentParser(
        description="AI Agent Test Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python tests/run_tests.py --all              # Run all tests
  python tests/run_tests.py --unit             # Run unit tests only
  python tests/run_tests.py --server           # Start test server
  python tests/run_tests.py --script test_hierarchy_workflow_nodes  # Run specific script
  python tests/run_tests.py --check            # Check test environment
        """
    )
    
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument("--unit", action="store_true", help="Run unit tests")
    parser.add_argument("--integration", action="store_true", help="Run integration tests")
    parser.add_argument("--api", action="store_true", help="Run API tests")
    parser.add_argument("--server", action="store_true", help="Start test server")
    parser.add_argument("--script", help="Run specific test script")
    parser.add_argument("--check", action="store_true", help="Check test environment")
    parser.add_argument("--list-scripts", action="store_true", help="List available test scripts")
    
    args = parser.parse_args()
    
    # Default action if no arguments
    if not any(vars(args).values()):
        parser.print_help()
        return 0
    
    # Execute requested action
    if args.check:
        return check_environment()
    elif args.all:
        return run_all_tests()
    elif args.unit:
        return run_unit_tests()
    elif args.integration:
        return run_integration_tests()
    elif args.api:
        return run_api_tests()
    elif args.server:
        return run_test_server()
    elif args.script:
        return run_test_scripts(args.script)
    elif args.list_scripts:
        return run_test_scripts()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())