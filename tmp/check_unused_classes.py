import os
import re

organizer_dir = r"e:\projects\python\Swaya\frontend\src\app\pages\organizer"

# Find all CSS module files and JSX files in organizer_dir
css_files = []
jsx_files = []

for root, dirs, files in os.walk(organizer_dir):
    for f in files:
        if f.endswith(".module.css"):
            css_files.append(os.path.join(root, f))
        elif f.endswith(".jsx"):
            jsx_files.append(os.path.join(root, f))

# Let's read all JSX files and collect all patterns like styles['something'] or styles.something
# Note that we should look for references to any styles object (styles or panelStyles, etc.)
style_refs = set()
for jf in jsx_files:
    try:
        with open(jf, "r", encoding="utf-8") as f:
            content = f.read()
            # Find styles['something'] or styles["something"]
            for m in re.finditer(r"styles\[['\"]([^'\"]+)['\"]\]", content):
                style_refs.add(m.group(1))
            # Find styles.something (handling camelCase or snake-case if used via property access, though property access usually requires valid identifiers)
            for m in re.finditer(r"styles\.([a-zA-Z0-9_\-]+)", content):
                style_refs.add(m.group(1))
    except Exception as e:
        print(f"Error reading {jf}: {e}")

# Now let's extract all class definitions from each CSS file
# Class definition regex: .class-name
for css in css_files:
    print(f"\nCSS File: {os.path.basename(css)}")
    try:
        with open(css, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {css}: {e}")
        continue
    
    # Simple regex for CSS class selectors (e.g. .class-name)
    # We should avoid matches inside comments or media queries, but a simple match is a good start.
    # Strip comments first
    content_clean = re.sub(r"/\*[\s\S]*?\*/", "", content)
    
    # Match classes like .class-name but not followed by colons or parameters or digits alone
    classes = set()
    for m in re.finditer(r"\.([a-zA-Z0-9_\-]+)", content_clean):
        cls = m.group(1)
        # Avoid animation keyframe percentage classes like .5% or similar (not starting with digit usually)
        if cls and not cls[0].isdigit():
            classes.add(cls)
            
    # Check which classes are NOT in style_refs
    unused = []
    for cls in sorted(classes):
        if cls not in style_refs:
            unused.append(cls)
            
    if unused:
        print(f"  Unused classes ({len(unused)}):")
        for u in unused:
            print(f"    - {u}")
    else:
        print("  All classes seem referenced or no classes found.")
