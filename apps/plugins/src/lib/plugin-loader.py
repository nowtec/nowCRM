#!/usr/bin/env python3
"""Plugin loader script for NOWCRM plugins service.

This script discovers and initializes Python plugins installed via pip.
"""

import sys
import json
import os
import importlib.util
from pathlib import Path


def find_plugin_module(plugin_name: str, site_packages_dir: str) -> tuple[str | None, str | None]:
    """Find the actual importable module name for a plugin.
    
    Returns:
        Tuple of (module_name, module_path) or (None, None) if not found.
    """
    print(f"Debug: Searching for plugin '{plugin_name}' in site-packages: {site_packages_dir}", file=sys.stderr)
    
    # Check if site-packages directory exists
    if not os.path.exists(site_packages_dir):
        print(f"Error: Site-packages directory does not exist: {site_packages_dir}", file=sys.stderr)
        print(f"Debug: Current working directory: {os.getcwd()}", file=sys.stderr)
        print(f"Debug: Absolute path: {os.path.abspath(site_packages_dir)}", file=sys.stderr)
        return None, None
    
    if not os.path.isdir(site_packages_dir):
        print(f"Error: Site-packages path is not a directory: {site_packages_dir}", file=sys.stderr)
        return None, None
    
    expected_module_name = plugin_name.replace("-", "_")
    possible_paths = [
        os.path.join(site_packages_dir, expected_module_name),
        os.path.join(site_packages_dir, plugin_name.replace("-", "_")),
        os.path.join(site_packages_dir, plugin_name),
    ]
    
    # Search for directories matching the pattern
    try:
        all_dirs = [
            d for d in os.listdir(site_packages_dir)
            if os.path.isdir(os.path.join(site_packages_dir, d))
            and (expected_module_name in d.lower() or plugin_name.replace("-", "_") in d.lower())
        ]
        print(f"Debug: Found {len(all_dirs)} matching directories: {all_dirs}", file=sys.stderr)
        for dir_name in all_dirs:
            full_path = os.path.join(site_packages_dir, dir_name)
            if full_path not in possible_paths:
                possible_paths.append(full_path)
    except Exception as e:
        print(f"Error: Failed to list directory '{site_packages_dir}': {e}", file=sys.stderr)
        return None, None
    
    # Check dist-info to find the actual module name
    try:
        dist_info_dirs = [
            d for d in os.listdir(site_packages_dir)
            if d.endswith(".dist-info") and plugin_name.replace("-", "_") in d.lower()
        ]
    except Exception as e:
        print(f"Error: Failed to list dist-info directories: {e}", file=sys.stderr)
        dist_info_dirs = []
    
    # Also check for actual module directories (not just dist-info)
    try:
        all_items = os.listdir(site_packages_dir)
        module_dirs = [
            d for d in all_items
            if os.path.isdir(os.path.join(site_packages_dir, d))
            and not d.endswith(".dist-info")
            and (expected_module_name == d or plugin_name.replace("-", "_") == d)
        ]
        if module_dirs:
            print(f"Debug: Found potential module directories: {module_dirs}", file=sys.stderr)
            for mod_dir in module_dirs:
                mod_path = os.path.join(site_packages_dir, mod_dir)
                if mod_path not in possible_paths:
                    possible_paths.insert(0, mod_path)  # Add to beginning for priority
    except Exception as e:
        print(f"Debug: Error checking for module directories: {e}", file=sys.stderr)
    
    if dist_info_dirs:
        print(f"Debug: Found dist-info directories: {dist_info_dirs}", file=sys.stderr)
        
        # Extract module name from dist-info directory name
        dist_info_name = dist_info_dirs[0].replace(".dist-info", "")
        if "-" in dist_info_name:
            extracted_module = dist_info_name.rsplit("-", 1)[0]
            print(f"Debug: Extracted module name from dist-info: {extracted_module}", file=sys.stderr)
            extracted_path = os.path.join(site_packages_dir, extracted_module)
            if extracted_path not in possible_paths:
                possible_paths.append(extracted_path)
        
        # Try reading entry_points.txt and RECORD
        dist_info_path = os.path.join(site_packages_dir, dist_info_dirs[0])
        entry_points_file = os.path.join(dist_info_path, "entry_points.txt")
        if os.path.exists(entry_points_file):
            try:
                with open(entry_points_file, "r") as f:
                    content = f.read()
                    for line in content.split("\n"):
                        if "=" in line and not line.strip().startswith("["):
                            module_part = line.split("=")[1].strip().split(":")[0]
                            module_name = module_part.split(".")[0]
                            print(f"Debug: Found module from entry_points.txt: {module_name}", file=sys.stderr)
                            module_path = os.path.join(site_packages_dir, module_name)
                            if module_path not in possible_paths:
                                possible_paths.insert(0, module_path)  # Prioritize entry_points
            except Exception as e:
                print(f"Debug: Error reading entry_points.txt: {e}", file=sys.stderr)
        
        # Read RECORD file to find where files are actually installed
        record_file = os.path.join(dist_info_path, "RECORD")
        if os.path.exists(record_file):
            try:
                with open(record_file, "r") as f:
                    record_content = f.read()
                    # Find the first Python file to determine module structure
                    for line in record_content.split("\n"):
                        if line.strip() and "__init__.py" in line:
                            # RECORD format: path,sha256,size
                            file_path = line.split(",")[0]
                            # Extract directory name (e.g., "bexio_sync_plugin/__init__.py" -> "bexio_sync_plugin")
                            parts = file_path.split("/")
                            if len(parts) > 0:
                                potential_module = parts[0]
                                if potential_module and potential_module != "__pycache__":
                                    module_path = os.path.join(site_packages_dir, potential_module)
                                    if module_path not in possible_paths:
                                        print(f"Debug: Found module from RECORD: {potential_module} (from {file_path})", file=sys.stderr)
                                        possible_paths.insert(0, module_path)  # Highest priority
                                    break
            except Exception as e:
                print(f"Debug: Error reading RECORD file: {e}", file=sys.stderr)
        
        # Try using importlib.metadata
        try:
            from importlib.metadata import distribution, entry_points
            dist = distribution(plugin_name)
            eps = entry_points(group="console_scripts")
            for ep in eps:
                if ep.dist.name == plugin_name:
                    module_name = ep.value.split(":")[0].split(".")[0]
                    print(f"Debug: Found module from importlib.metadata: {module_name}", file=sys.stderr)
                    module_path = os.path.join(site_packages_dir, module_name)
                    if module_path not in possible_paths:
                        possible_paths.append(module_path)
        except ImportError:
            pass
        except Exception as e:
            print(f"Debug: Error using importlib.metadata: {e}", file=sys.stderr)
    
    # Check each possible path
    print(f"Info: Checking {len(possible_paths)} possible paths: {[os.path.basename(p) for p in possible_paths]}", file=sys.stderr)
    sys.stderr.flush()  # Ensure output is flushed
    
    for path in possible_paths:
        # Skip dist-info directories
        if path.endswith(".dist-info"):
            print(f"Debug: Skipping dist-info directory: {path}", file=sys.stderr)
            continue
        
        print(f"Info: Checking path: {path}", file=sys.stderr)
        sys.stderr.flush()
            
        if os.path.exists(path):
            print(f"Info: Path exists: {path}", file=sys.stderr)
            sys.stderr.flush()
            
            if os.path.isdir(path):
                init_file = os.path.join(path, "__init__.py")
                print(f"Info: Checking for __init__.py at: {init_file}", file=sys.stderr)
                sys.stderr.flush()
                
                if os.path.exists(init_file):
                    print(f"Info: Found module directory at: {path} with __init__.py", file=sys.stderr)
                    sys.stderr.flush()
                    module_name = os.path.basename(path)
                    return module_name, path
                else:
                    # Check if it's a namespace package (no __init__.py but has Python files)
                    try:
                        py_files = [f for f in os.listdir(path) if f.endswith(".py")]
                        if py_files:
                            print(f"Info: Found module directory at: {path} with Python files (namespace package): {py_files}", file=sys.stderr)
                            sys.stderr.flush()
                            module_name = os.path.basename(path)
                            return module_name, path
                    except Exception as e:
                        print(f"Debug: Error listing files in {path}: {e}", file=sys.stderr)
                        sys.stderr.flush()
            else:
                print(f"Debug: Path exists but is not a directory: {path}", file=sys.stderr)
                sys.stderr.flush()
        else:
            print(f"Debug: Path does not exist: {path}", file=sys.stderr)
            sys.stderr.flush()
    
    # If no module directory found, try importing directly
    print(f"Info: No module directory found, attempting direct import of '{expected_module_name}'", file=sys.stderr)
    sys.stderr.flush()
    
    # Try importing the module directly - Python might find it even if directory structure is different
    import_attempts = [
        expected_module_name,
        plugin_name.replace("-", "_"),
    ]
    
    for module_to_try in import_attempts:
        try:
            print(f"Info: Attempting to import '{module_to_try}'", file=sys.stderr)
            sys.stderr.flush()
            imported = __import__(module_to_try)
            print(f"Info: Successfully imported '{module_to_try}' directly", file=sys.stderr)
            sys.stderr.flush()
            
            # Try to find where it was imported from
            if hasattr(imported, "__file__") and imported.__file__:
                module_path = os.path.dirname(imported.__file__)
                print(f"Info: Module '{module_to_try}' imported from: {module_path}", file=sys.stderr)
                sys.stderr.flush()
                return module_to_try, module_path
            elif hasattr(imported, "__path__"):
                # It's a package
                module_paths = imported.__path__
                if module_paths and len(module_paths) > 0:
                    module_path = module_paths[0]
                    print(f"Info: Module '{module_to_try}' is a package at: {module_path}", file=sys.stderr)
                    sys.stderr.flush()
                    return module_to_try, module_path
        except ImportError as e:
            print(f"Debug: Direct import of '{module_to_try}' failed: {e}", file=sys.stderr)
            sys.stderr.flush()
            continue
        except Exception as e:
            print(f"Debug: Unexpected error importing '{module_to_try}': {e}", file=sys.stderr)
            sys.stderr.flush()
            continue
    
    # List all directories in site-packages for debugging
    try:
        all_items = os.listdir(site_packages_dir)
        dirs_only = [d for d in all_items if os.path.isdir(os.path.join(site_packages_dir, d)) and not d.endswith(".dist-info")]
        files_only = [f for f in all_items if os.path.isfile(os.path.join(site_packages_dir, f))]
        print(f"Debug: All directories in site-packages: {dirs_only}", file=sys.stderr)
        print(f"Debug: All files in site-packages: {files_only}", file=sys.stderr)
        sys.stderr.flush()
        
        # Check RECORD file to see what was actually installed
        if dist_info_dirs:
            record_file = os.path.join(site_packages_dir, dist_info_dirs[0], "RECORD")
            if os.path.exists(record_file):
                try:
                    with open(record_file, "r") as f:
                        record_lines = [line.split(",")[0] for line in f if line.strip() and not line.endswith("RECORD,")]
                        py_files = [f for f in record_lines if f.endswith(".py")]
                        print(f"Debug: Python files listed in RECORD: {py_files}", file=sys.stderr)
                        sys.stderr.flush()
                        if not py_files:
                            print(f"Warning: RECORD file shows no Python module files were installed! Only entry point script exists.", file=sys.stderr)
                            print(f"Warning: This indicates the package installation is incomplete. The package may need to be reinstalled.", file=sys.stderr)
                            sys.stderr.flush()
                except Exception as e:
                    print(f"Debug: Could not read RECORD file: {e}", file=sys.stderr)
                    sys.stderr.flush()
    except Exception as e:
        print(f"Debug: Could not list site-packages contents: {e}", file=sys.stderr)
        sys.stderr.flush()
    
    return None, None


def import_plugin(module_name: str, module_path: str | None = None) -> object | None:
    """Import a plugin module and return the plugin instance."""
    print(f"Info: Attempting to import plugin from module '{module_name}'", file=sys.stderr)
    if module_path:
        print(f"Info: Module path: {module_path}", file=sys.stderr)
    sys.stderr.flush()
    
    strategies = [
        # Strategy 1: Direct import from module root
        ("Direct import: module.plugin", lambda: __import__(module_name, fromlist=["plugin"]).plugin),
        # Strategy 2: Import module and access plugin attribute
        ("Import module and get plugin attribute", lambda: getattr(__import__(module_name), "plugin", None)),
        # Strategy 3: Import module and look for Plugin class, then instantiate
        ("Import Plugin class and instantiate", lambda: getattr(__import__(module_name), "Plugin", None)()),
        # Strategy 4: Try importing from main submodule
        ("Import from main submodule: module.main.plugin", lambda: getattr(__import__(f"{module_name}.main", fromlist=["plugin"]), "plugin", None)),
        # Strategy 5: Try importing the main module and look for plugin
        ("Import main module and get plugin", lambda: getattr(__import__(f"{module_name}.main"), "plugin", None)),
    ]
    
    for strategy_name, strategy in strategies:
        try:
            print(f"Info: Trying strategy: {strategy_name}", file=sys.stderr)
            sys.stderr.flush()
            result = strategy()
            if result is not None:
                print(f"Info: Successfully found plugin using strategy: {strategy_name}", file=sys.stderr)
                print(f"Info: Plugin instance type: {type(result).__name__}", file=sys.stderr)
                if hasattr(result, 'name'):
                    print(f"Info: Plugin name attribute: {result.name}", file=sys.stderr)
                if hasattr(result, 'version'):
                    print(f"Info: Plugin version attribute: {result.version}", file=sys.stderr)
                sys.stderr.flush()
                return result
            else:
                print(f"Debug: Strategy {strategy_name} returned None", file=sys.stderr)
                sys.stderr.flush()
        except ImportError as e:
            print(f"Debug: Strategy '{strategy_name}' ImportError: {e}", file=sys.stderr)
            sys.stderr.flush()
            continue
        except AttributeError as e:
            print(f"Debug: Strategy '{strategy_name}' AttributeError: {e}", file=sys.stderr)
            sys.stderr.flush()
            continue
        except Exception as e:
            print(f"Debug: Strategy '{strategy_name}' error: {type(e).__name__}: {e}", file=sys.stderr)
            sys.stderr.flush()
            continue
    
    print(f"Info: All import strategies failed for module '{module_name}'", file=sys.stderr)
    sys.stderr.flush()
    return None


def main():
    """Main entry point for plugin loader."""
    if len(sys.argv) < 3:
        print("Usage: plugin-loader.py <plugin_name> <site_packages_dir>", file=sys.stderr)
        sys.exit(1)
    
    plugin_name = sys.argv[1]
    site_packages_dir = sys.argv[2]
    
    print(f"Info: Starting plugin loader for '{plugin_name}'", file=sys.stderr)
    print(f"Info: Site-packages directory: {site_packages_dir}", file=sys.stderr)
    print(f"Info: Python executable: {sys.executable}", file=sys.stderr)
    print(f"Info: Python version: {sys.version}", file=sys.stderr)
    
    # Try to find the module
    print(f"Info: Searching for plugin module '{plugin_name}'", file=sys.stderr)
    sys.stderr.flush()
    module_name, module_path = find_plugin_module(plugin_name, site_packages_dir)
    
    if module_name is None:
        print(f"Info: Plugin {plugin_name} is installed but module cannot be imported.", file=sys.stderr)
        print(f"Info: This is normal if the plugin is a CLI tool or initialized on-demand.", file=sys.stderr)
        sys.stderr.flush()
        sys.exit(0)
    
    print(f"Info: Found plugin module: {module_name}", file=sys.stderr)
    if module_path:
        print(f"Info: Module path: {module_path}", file=sys.stderr)
    sys.stderr.flush()
    
    # Try to import the plugin
    print(f"Info: Importing plugin instance from module '{module_name}'", file=sys.stderr)
    sys.stderr.flush()
    plugin_instance = import_plugin(module_name, module_path)
    
    if plugin_instance is None:
        print(f"Warning: Could not find plugin instance for {plugin_name}", file=sys.stderr)
        print(f"Debug: Available attributes in module: {dir(__import__(module_name))}", file=sys.stderr)
        sys.stderr.flush()
        sys.exit(0)
    
    print(f"Info: Successfully imported plugin instance: {type(plugin_instance).__name__}", file=sys.stderr)
    if hasattr(plugin_instance, 'name'):
        print(f"Info: Plugin name: {plugin_instance.name}", file=sys.stderr)
    if hasattr(plugin_instance, 'version'):
        print(f"Info: Plugin version: {plugin_instance.version}", file=sys.stderr)
    if hasattr(plugin_instance, 'metadata'):
        print(f"Info: Plugin metadata: {plugin_instance.metadata}", file=sys.stderr)
    sys.stderr.flush()
    
    # Try to initialize if method exists
    # We need to capture plugin's stdout/stderr output during initialization
    # Python's print() goes to stdout, but we want to forward it to stderr for logging
    import io
    import contextlib
    
    # Use unbuffered StringIO to capture output immediately
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    
    try:
        if hasattr(plugin_instance, 'initialize'):
            print(f"Info: Plugin has initialize() method, calling it...", file=sys.stderr)
            sys.stderr.flush()
            
            # Capture stdout/stderr during plugin initialization
            # This will capture any print() statements from the plugin
            with contextlib.redirect_stdout(stdout_capture), contextlib.redirect_stderr(stderr_capture):
                result = plugin_instance.initialize()
            
            print(f"Info: Plugin initialize() completed", file=sys.stderr)
            sys.stderr.flush()
            
            # Output captured stdout/stderr to stderr so it gets logged by the plugin logger
            stdout_output = stdout_capture.getvalue()
            stderr_output = stderr_capture.getvalue()
            
            print(f"Info: Captured stdout: {len(stdout_output)} chars, stderr: {len(stderr_output)} chars", file=sys.stderr)
            sys.stderr.flush()
            
            # Forward stdout output (plugin's print statements) to stderr for logging
            if stdout_output:
                print(f"Info: Plugin stdout output:", file=sys.stderr)
                for line in stdout_output.strip().split('\n'):
                    if line.strip():
                        print(f"Info: {line.strip()}", file=sys.stderr)
                        sys.stderr.flush()
            else:
                print(f"Debug: No stdout output captured from plugin", file=sys.stderr)
                sys.stderr.flush()
            
            # Forward stderr output to stderr for logging
            if stderr_output:
                print(f"Info: Plugin stderr output:", file=sys.stderr)
                for line in stderr_output.strip().split('\n'):
                    if line.strip():
                        print(f"Info: {line.strip()}", file=sys.stderr)
                        sys.stderr.flush()
            
            # Output the result to stdout (structured output)
            if result:
                print(f"Info: Plugin initialize() returned: {type(result).__name__}", file=sys.stderr)
                if isinstance(result, dict):
                    print(f"Info: Result keys: {list(result.keys())}", file=sys.stderr)
                    print(json.dumps(result))
                    sys.stdout.flush()
                else:
                    print(f"Plugin {plugin_name} initialized: {result}")
                    sys.stdout.flush()
            else:
                print(f"Debug: Plugin initialize() returned None", file=sys.stderr)
                sys.stderr.flush()
        else:
            print(f"Info: Plugin does not have initialize() method", file=sys.stderr)
            print(f"Debug: Available methods: {[m for m in dir(plugin_instance) if not m.startswith('_')]}", file=sys.stderr)
            sys.stderr.flush()
            print(f"Plugin {plugin_name} loaded (no initialize method)")
            sys.stdout.flush()
    except Exception as e:
        import traceback
        error_msg = str(e)
        error_traceback = traceback.format_exc()
        print(f"Error: Could not initialize {plugin_name}: {error_msg}", file=sys.stderr)
        print(f"Debug: Traceback: {error_traceback}", file=sys.stderr)
        sys.stderr.flush()
        sys.exit(0)


if __name__ == "__main__":
    main()
