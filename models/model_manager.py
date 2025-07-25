from config.loader import ConfigLoader

import yaml
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import tkinter.font as tkFont
from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()

class ModelManager:
    def __init__(self, root):
        self.root = root
        self.root.title("OCRacle")
        self.root.geometry("850x750")
        
        self.title_font = tkFont.Font(family="Segoe UI", size=12, weight="bold")
        self.header_font = tkFont.Font(family="Segoe UI", size=10, weight="bold")
        self.body_font = tkFont.Font(family="Segoe UI", size=9)
        self.small_font = tkFont.Font(family="Segoe UI", size=8)
        
        # Styles
        self.style = ttk.Style()
        self.style.theme_use('default')
        
        # Enhanced color scheme
        bg_color = '#1e1e1e'  # Dark background
        fg_color = '#e0e0e0'  # Light text
        accent_color = '#64b5f6'  # Bright blue
        tab_bg = '#2d2d2d'  # Slightly lighter than background for tabs
        tab_fg = '#b0b0b0'  # Muted text for tabs
        container_bg = '#252525'  # Container background
        status_bg = '#1a1a1a'  # Status bar background
        
        # Configure styles with modern fonts
        self.style.configure('.', 
                           background=bg_color, 
                           foreground=fg_color, 
                           font=self.body_font)
                            
        self.style.configure('TFrame', background=bg_color)
        
        # Container styles
        self.style.configure('Container.TFrame', 
                           background=container_bg,
                           relief='solid',
                           borderwidth=1)
        
        self.style.configure('TNotebook', 
                           background=bg_color, 
                           borderwidth=0, 
                           tabposition='n')
        
        self.style.layout('TNotebook', [
            ('Notebook.client', {'sticky': 'nswe'}),
            ('Notebook.tab', {'sticky': 'n'})
        ])
        
        self.style.configure('TNotebook.Tab', 
                           padding=[20, 8],
                           background=tab_bg,
                           foreground=tab_fg,
                           font=self.body_font)
                           
        self.style.map('TNotebook.Tab',
                     background=[('selected', bg_color), ('active', tab_bg)],
                     foreground=[('selected', accent_color), ('active', fg_color)])
        
        self.style.configure('TButton', 
                           background='#2d2d2d',
                           foreground=fg_color,
                           borderwidth=1,
                           padding=8,
                           font=self.body_font)
                           
        self.style.map('TButton',
                     background=[('active', '#3d3d3d')],
                     foreground=[('active', accent_color)],
                     relief=[('active', 'flat')])
        
        self.style.configure('TLabelframe', 
                           background=bg_color,
                           borderwidth=2,
                           relief='ridge',
                           border='#404040')
                           
        self.style.configure('TLabelframe.Label',
                           font=self.header_font,
                           foreground=accent_color,
                           background=bg_color)
        
        self.style.configure('TCheckbutton',
                           background=bg_color,
                           foreground=fg_color,
                           font=self.body_font)
                           
        self.style.map('TCheckbutton',
                     background=[('active', '#2a2a2a')],
                     foreground=[('active', accent_color)])
        
        # Status bar style
        self.style.configure('Status.TFrame',
                           background=status_bg,
                           relief='sunken',
                           borderwidth=1)
        
        # Load configuration
        self.config_path = Path(__file__).parent / '../config/yaml/model_config.yaml'
        self.input_config_path = Path(__file__).parent / '../config/yaml/input_config.yaml'
        self.load_config()
        
        # Initialize input configuration variables
        self.dataset_path = tk.StringVar()
        self.images_count = tk.IntVar()
        self.load_input_config()
        
        # Create UI
        self.setup_ui()
    
    def load_config(self):
        """Load the model configuration from YAML file with validation."""
        try:
            loader = ConfigLoader()
            app_config = loader.load_app_config()
            
            # Convert back to dict format for compatibility with existing UI code
            self.config = {'models': []}
            for model in app_config.models_config.models:
                self.config['models'].append({
                    'provider': model.provider,
                    'id': model.id,
                    'enabled': model.enabled,
                    'api_key_env': model.api_key_env
                })
            
            # Group models by provider
            self.providers = {}
            for model in self.config.get('models', []):
                provider = model['provider']
                if provider not in self.providers:
                    self.providers[provider] = []
                self.providers[provider].append(model)
                
        except Exception as e:
            messagebox.showerror("Configuration Error", f"Failed to load configuration:\n{str(e)}")
            # Fallback to empty config
            self.config = {'models': []}
            self.providers = {}
    
    def load_input_config(self):
        """Load the input configuration from YAML file."""
        try:
            with open(self.input_config_path, 'r') as f:
                input_config = yaml.safe_load(f)
                if input_config and 'input' in input_config and input_config['input']:
                    first_input = input_config['input'][0]
                    self.dataset_path.set(first_input.get('path', ''))
                    self.images_count.set(first_input.get('images_to_process', 3))
                else:
                    self.dataset_path.set('')
                    self.images_count.set(3)
        except FileNotFoundError:
            # Set defaults if file doesn't exist
            self.dataset_path.set('')
            self.images_count.set(3)
        except Exception as e:
            messagebox.showerror("Input Config Error", f"Failed to load input configuration:\n{str(e)}")
            self.dataset_path.set('')
            self.images_count.set(3)

    def save_config(self):
        """Save both model and input configurations."""
        try:
            # Save model config
            models = []
            for provider_models in self.providers.values():
                models.extend(provider_models)
            
            self.config['models'] = models
            with open(self.config_path, 'w') as f:
                yaml.dump(self.config, f, sort_keys=False)
            
            # Save input config
            self.save_input_config()
            
            messagebox.showinfo("Success", "Configuration saved successfully!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save configuration:\n{str(e)}")

    def save_input_config(self):
        """Save the input configuration to YAML file."""
        input_config = {
            'input': [{
                'path': self.dataset_path.get(),
                'images_to_process': self.images_count.get()
            }]
        }
        
        with open(self.input_config_path, 'w') as f:
            yaml.dump(input_config, f, sort_keys=False)

    def browse_dataset_folder(self):
        """Open file dialog to select dataset folder."""
        folder_path = filedialog.askdirectory(
            title="Select Folder",
            initialdir=self.dataset_path.get() if self.dataset_path.get() else "."
        )
        
        if folder_path:
            # Remove everything before "GT4HistOCR" from the path
            if "GT4HistOCR" in folder_path:
                # Find the position of GT4HistOCR and keep everything from there
                gt4hist_index = folder_path.find("GT4HistOCR")
                relative_path = folder_path[gt4hist_index:]
                self.dataset_path.set(relative_path)
            else:
                # If GT4HistOCR is not in the path, use the full path as fallback
                self.dataset_path.set(folder_path)
            
            # Check if folder contains PNG images and show count
            self.validate_dataset_folder(folder_path)

    def validate_dataset_folder(self, folder_path):
        """Validate the selected dataset folder and show image count."""
        try:
            path = Path(folder_path)
            png_files = list(path.glob("*.png"))
            
            if png_files:
                # Update the status label
                if hasattr(self, 'dataset_status_label'):
                    self.dataset_status_label.config(
                        text=f"✓ Found {len(png_files)} PNG images",
                        foreground='#81c784'
                    )
                # Suggest a reasonable default value for the images
                if len(png_files) < self.images_count.get():
                    self.images_count.set(min(len(png_files), 5))
            else:
                if hasattr(self, 'dataset_status_label'):
                    self.dataset_status_label.config(
                        text="⚠ No PNG images found",
                        foreground='#e57373'
                    )
        except Exception as e:
            if hasattr(self, 'dataset_status_label'):
                self.dataset_status_label.config(
                    text=f"✗ Error: {str(e)}",
                    foreground='#e57373'
                )
    
    def create_dataset_section(self, parent):
        """Create the dataset configuration section."""
        # Main dataset configuration container
        dataset_container = ttk.Frame(parent, style='Container.TFrame', padding=15)
        dataset_container.pack(fill=tk.X, pady=(0, 15))
        
        # Dataset configuration frame
        dataset_frame = ttk.LabelFrame(
            dataset_container,
            text=" Dataset Configuration ",
            padding=20,
            style='TLabelframe'
        )
        dataset_frame.pack(fill=tk.X)
        
        # Dataset path section
        path_section = ttk.Frame(dataset_frame)
        path_section.pack(fill=tk.X, pady=(0, 15))
        
        # Path label
        path_label = ttk.Label(
            path_section,
            text="Folder:",
            font=self.header_font,
            foreground='#e0e0e0'
        )
        path_label.pack(anchor='w', pady=(0, 5))
        
        # Path input frame
        path_input_frame = ttk.Frame(path_section)
        path_input_frame.pack(fill=tk.X, pady=(0, 5))
        
        # Configure entry style
        self.style.configure('Dataset.TEntry',
                           fieldbackground='#2d2d2d',
                           foreground='#e0e0e0',
                           borderwidth=1,
                           insertcolor='#64b5f6')
        
        # Path entry
        path_entry = ttk.Entry(
            path_input_frame,
            textvariable=self.dataset_path,
            font=self.body_font,
            style='Dataset.TEntry',
            width=50
        )
        path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10))
        
        # Browse button
        browse_btn = ttk.Button(
            path_input_frame,
            text="Browse Folder...",
            command=self.browse_dataset_folder,
            style='TButton',
            width=15
        )
        browse_btn.pack(side=tk.RIGHT)
        
        # Dataset status label
        self.dataset_status_label = ttk.Label(
            path_section,
            text="Select a folder containing PNG images",
            font=self.small_font,
            foreground='#b0b0b0'
        )
        self.dataset_status_label.pack(anchor='w')
        
        # Images count section
        count_section = ttk.Frame(dataset_frame)
        count_section.pack(fill=tk.X, pady=(10, 0))
        
        # Count label
        count_label = ttk.Label(
            count_section,
            text="Number of Images to Process:",
            font=self.header_font,
            foreground='#e0e0e0'
        )
        count_label.pack(anchor='w', pady=(0, 5))
        
        # Count input frame
        count_input_frame = ttk.Frame(count_section)
        count_input_frame.pack(anchor='w')
        
        # Configure spinbox style
        self.style.configure('Dataset.TSpinbox',
                           fieldbackground='#2d2d2d',
                           foreground='#e0e0e0',
                           borderwidth=1,
                           insertcolor='#64b5f6')
        
        # Images count spinbox
        count_spinbox = ttk.Spinbox(
            count_input_frame,
            from_=1,
            to=100,
            textvariable=self.images_count,
            font=self.body_font,
            style='Dataset.TSpinbox',
            width=10
        )
        count_spinbox.pack(side=tk.LEFT, padx=(0, 10))
        
        # Count help text
        count_help = ttk.Label(
            count_input_frame,
            text="(Random selection from available images)",
            font=self.small_font,
            foreground='#b0b0b0'
        )
        count_help.pack(side=tk.LEFT)
        
        # Validate initial dataset if path exists
        if self.dataset_path.get():
            self.validate_dataset_folder(self.dataset_path.get())
    
    def toggle_model(self, model, var):
        """Toggle a model's enabled state."""
        model['enabled'] = var.get()
        # Update status bar when model selection changes
        self.update_status_bar()
        
    def run_app(self):
        """Run the main application."""
        import subprocess
        import sys
        import os
        
        # Save any pending changes first
        self.save_config()
        
        # Get the path to the current Python interpreter
        python = sys.executable
        app_path = os.path.join(os.path.dirname(__file__), '../run_process.py')
        
        try:
            # Run app.py in a new process
            subprocess.Popen([python, app_path])
            messagebox.showinfo("Success", "App is starting in a new window!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start app: {str(e)}")
    
    def setup_ui(self):
        # Main container
        main_frame = ttk.Frame(self.root, padding=15)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=10)
        
        # Dataset Configuration section
        self.create_dataset_section(main_frame)
        
        # Model Selection Container
        models_container = ttk.Frame(main_frame, style='Container.TFrame', padding=15)
        models_container.pack(fill=tk.BOTH, expand=True, pady=(0, 15))
        
        # Models header
        models_header = ttk.LabelFrame(
            models_container,
            text=" Models Selection ",
            padding=(15, 10),
            style='TLabelframe'
        )
        models_header.pack(fill=tk.BOTH, expand=True)
        
        # Notebook for model providers
        notebook = ttk.Notebook(models_header)
        notebook.pack(fill=tk.BOTH, expand=True, pady=(10, 0))
        
        # Provider tabs
        for provider, models in sorted(self.providers.items()):
            tab = ttk.Frame(notebook, padding=15)
            notebook.add(tab, text=f"{provider}")
            
            # Models list frame
            models_frame = ttk.Frame(tab)
            models_frame.pack(fill=tk.BOTH, expand=True)
            
            # Models checkboxes
            for model in models:
                var = tk.BooleanVar(value=model.get('enabled', False))
                var.trace_add('write', lambda *args, m=model, v=var: self.toggle_model(m, v))
                
                model_frame = ttk.Frame(models_frame)
                model_frame.pack(fill=tk.X, pady=3)
                
                cb = ttk.Checkbutton(
                    model_frame,
                    text=model['id'],
                    variable=var,
                    style='TCheckbutton',
                    padding=(5, 4)
                )
                cb.pack(side=tk.LEFT, anchor='w')
                
                # API key status
                api_key = model.get('api_key_env')
                has_api_key = bool(os.getenv(api_key)) if api_key else False
                
                status_text = "API Key set" if has_api_key else "API Key required"
                status_color = '#81c784' if has_api_key else '#e57373'
                
                status_label = ttk.Label(
                    model_frame,
                    text=status_text,
                    font=self.small_font,
                    foreground=status_color
                )
                status_label.pack(side=tk.LEFT, padx=(15, 0))
        
        # Add buttons container with subtle spacing
        btn_container = ttk.Frame(main_frame, padding=(0, 15, 0, 5))
        btn_container.pack(fill=tk.X)
        
        btn_frame = ttk.Frame(btn_container)
        btn_frame.pack(anchor='center')
        
        # Config primary button style
        self.style.configure('Primary.TButton',
                           background='#1976d2',
                           foreground='#ffffff',
                           font=self.body_font,
                           borderwidth=1,
                           padding=8)
                           
        self.style.map('Primary.TButton',
                     background=[('active', '#1565c0')],
                     foreground=[('active', '#ffffff')])
        
        # Save button
        btn_save = ttk.Button(
            btn_frame,
            text="Save Configuration",
            command=self.save_config,
            style='TButton',
            width=18
        )
        btn_save.pack(side=tk.LEFT, padx=8)
        
        # Run app button
        btn_run = ttk.Button(
            btn_frame,
            text="Run OCRacle",
            command=self.run_app,
            style='Primary.TButton',
            width=18
        )
        btn_run.pack(side=tk.LEFT, padx=8)
        
        # Status bar
        self.create_status_bar()
        
        # Update status bar with initial information
        self.update_status_bar()
    
    def create_status_bar(self):
        """Create the status bar at the bottom of the window."""
        self.status_bar = ttk.Frame(self.root, style='Status.TFrame', padding=(10, 5))
        self.status_bar.pack(fill=tk.X, side=tk.BOTTOM)
        
        # Left side - Status message
        self.status_label = ttk.Label(
            self.status_bar,
            text="Ready",
            font=self.small_font,
            foreground='#b0b0b0',
            background='#1a1a1a'
        )
        self.status_label.pack(side=tk.LEFT)
        
        # Right side - Model and dataset info
        self.info_label = ttk.Label(
            self.status_bar,
            text="OCRacle v1.0",
            font=self.small_font,
            foreground='#64b5f6',
            background='#1a1a1a'
        )
        self.info_label.pack(side=tk.RIGHT)
    
    def update_status_bar(self):
        """Update the status bar with current configuration information."""
        try:
            # Count enabled models
            enabled_models = sum(
                sum(1 for model in models if model.get('enabled', False))
                for models in self.providers.values()
            )
            total_models = sum(len(models) for models in self.providers.values())
            
            # Get dataset info
            dataset_info = ""
            if self.dataset_path.get():
                try:
                    path = Path(self.dataset_path.get())
                    if path.exists():
                        png_files = list(path.glob("*.png"))
                        dataset_info = f" • Dataset: {len(png_files)} images"
                    else:
                        dataset_info = " • Dataset: Path not found"
                except:
                    dataset_info = " • Dataset: Error reading path"
            else:
                dataset_info = " • Dataset: Not selected"
            
            # Update status
            if enabled_models > 0:
                status_text = f"Ready • {enabled_models}/{total_models} models selected"
            else:
                status_text = "No models selected"
            
            self.status_label.config(text=status_text)
            
            # Update info
            info_text = f"OCRacle v1.0{dataset_info}"
            self.info_label.config(text=info_text)
            
        except Exception as e:
            self.status_label.config(text="Status update error")
            self.info_label.config(text="OCRacle v1.0")