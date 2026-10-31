"""
Pytest configuration file to fix module import issues.

This file adds the project root to Python's module search path,
allowing tests to import from workflows, database, services, etc.
"""
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

print(f"✓ Added to Python path: {project_root}")
