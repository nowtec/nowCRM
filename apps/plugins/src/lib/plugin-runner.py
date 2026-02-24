#!/usr/bin/env python3
"""Plugin runner script for NOWCRM plugins service.

This script executes a plugin's main() function.
"""

import sys
import json
import os
import importlib.util
from pathlib import Path


def find_plugin_module(plugin_name: str, site_packages_dir: str) -> tuple[str | None, str | None]:
    """Find the actual importable module name for a plugin."""
    print(f"Info: Searching for plugin '{plugin_name}' in site-packages: {site_packages_dir}", file=sys.stderr)
    
    if not os.path.exists(site_packages_dir) or not os.path.isdir(site_packages_dir):
        print(f"Error: Site-packages directory does not exist: {site_packages_dir}", file=sys.stderr)
        return None, None
    
    expected_module_name = plugin_name.replace("-", "_")
    
    # Try to find the module directory
    module_path = os.path.join(site_packages_dir, expected_module_name)
    if os.path.exists(module_path) and os.path.isdir(module_path):
        init_file = os.path.join(module_path, "__init__.py")
        if os.path.exists(init_file):
            print(f"Info: Found module directory at: {module_path}", file=sys.stderr)
            return expected_module_name, module_path
    
    # Try direct import
    try:
        imported = __import__(expected_module_name)
        if hasattr(imported, "__file__") and imported.__file__:
            module_path = os.path.dirname(imported.__file__)
            print(f"Info: Module '{expected_module_name}' imported from: {module_path}", file=sys.stderr)
            return expected_module_name, module_path
        elif hasattr(imported, "__path__"):
            module_paths = imported.__path__
            if module_paths and len(module_paths) > 0:
                print(f"Info: Module '{expected_module_name}' is a package at: {module_paths[0]}", file=sys.stderr)
                return expected_module_name, module_paths[0]
    except ImportError:
        pass
    
    return None, None


def execute_plugin_main(module_name: str) -> int:
    """Execute a plugin's main() function."""
    try:
        # Import the main module
        print(f"Info: Importing {module_name}.main", file=sys.stderr)
        sys.stderr.flush()
        main_module = __import__(f"{module_name}.main", fromlist=["main"])
        
        if not hasattr(main_module, "main"):
            print(f"Error: Module '{module_name}.main' does not have a main() function", file=sys.stderr)
            print(f"Debug: Available attributes: {[attr for attr in dir(main_module) if not attr.startswith('_')]}", file=sys.stderr)
            sys.stderr.flush()
            return 1
        
        # Save original sys.argv and replace it with what the plugin expects
        # The plugin's main() uses parse_args() which reads from sys.argv
        # We need to set sys.argv to just contain the script name (and optional arguments)
        original_argv = sys.argv.copy()
        try:
            # Set sys.argv to what the plugin expects: [script_name] or [script_name, --resource, ...]
            # Use a realistic script name that matches what the CLI entry point would be
            # For bexio-sync-plugin, the entry point is "bexio-sync", so we'll use that pattern
            script_name = module_name.replace("_", "-")
            sys.argv = [script_name]
            
            print(f"Debug: Set sys.argv to: {sys.argv}", file=sys.stderr)
            sys.stderr.flush()
            
            # Execute main()
            print(f"Info: Executing {module_name}.main()", file=sys.stderr)
            sys.stderr.flush()
            
            result = main_module.main()
            
            # main() should return an int (exit code)
            if isinstance(result, int):
                print(f"Info: Plugin main() completed with exit code: {result}", file=sys.stderr)
                sys.stderr.flush()
                return result
            else:
                print(f"Info: Plugin main() completed (returned: {result})", file=sys.stderr)
                sys.stderr.flush()
                return 0
        finally:
            # Restore original sys.argv
            sys.argv = original_argv
            
    except ImportError as e:
        print(f"Error: Could not import {module_name}.main: {e}", file=sys.stderr)
        import traceback
        print(f"Debug: ImportError traceback: {traceback.format_exc()}", file=sys.stderr)
        sys.stderr.flush()
        return 1
    except SystemExit as e:
        # main() might call sys.exit() or raise SystemExit
        exit_code = e.code if isinstance(e.code, int) else (0 if e.code is None else 1)
        print(f"Info: Plugin main() exited with code: {exit_code}", file=sys.stderr)
        sys.stderr.flush()
        return exit_code
    except Exception as e:
        print(f"Error: Failed to execute plugin main(): {type(e).__name__}: {e}", file=sys.stderr)
        import traceback
        print(f"Debug: Exception traceback: {traceback.format_exc()}", file=sys.stderr)
        sys.stderr.flush()
        return 1


def main():
    """Main entry point for plugin runner."""
    if len(sys.argv) < 3:
        print("Usage: plugin-runner.py <plugin_name> <site_packages_dir>", file=sys.stderr)
        sys.exit(1)
    
    plugin_name = sys.argv[1]
    site_packages_dir = sys.argv[2]
    
    print(f"Info: Starting plugin runner for '{plugin_name}'", file=sys.stderr)
    print(f"Info: Site-packages directory: {site_packages_dir}", file=sys.stderr)
    sys.stderr.flush()
    
    # Find the module
    module_name, module_path = find_plugin_module(plugin_name, site_packages_dir)
    
    if module_name is None:
        print(f"Error: Could not find plugin module '{plugin_name}'", file=sys.stderr)
        sys.exit(1)
    
    # Execute the plugin's main() function
    exit_code = execute_plugin_main(module_name)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
