import tkinter as tk
from tkinter import filedialog, messagebox
import subprocess
import os
import shutil

try:
    import tkinterdnd2 as tkdnd
    DND_AVAILABLE = True
except ImportError:
    DND_AVAILABLE = False

GHOSTSCRIPT_PATH = 'gswin64c'  # Change to 'gswin32c' if on 32-bit Windows

def compress_pdf_with_gs(input_path, output_path, quality, color_dpi, gray_dpi, mono_dpi, jpeg_quality):
    try:
        args = [
            GHOSTSCRIPT_PATH,
            '-sDEVICE=pdfwrite',
            '-dCompatibilityLevel=1.4',
            f'-dPDFSETTINGS={quality}',
            f'-dColorImageDownsampleType=/Average',
            f'-dColorImageResolution={color_dpi}',
            f'-dGrayImageDownsampleType=/Average',
            f'-dGrayImageResolution={gray_dpi}',
            f'-dMonoImageDownsampleType=/Subsample',
            f'-dMonoImageResolution={mono_dpi}',
            f'-dColorImageFilter=/DCTEncode',
            f'-dGrayImageFilter=/DCTEncode',
            f'-dJPEGQ={jpeg_quality}',
            '-dAutoRotatePages=/None',
            '-dDetectDuplicateImages=true',
            '-dRemoveUnusedObjects=true',
            '-dRemoveUnusedStreams=true',
            '-dCompressFonts=true',
            '-dDownsampleColorImages=true',
            '-dDownsampleGrayImages=true',
            '-dDownsampleMonoImages=true',
            '-dNOPAUSE',
            '-dQUIET',
            '-dBATCH',
            f'-sOutputFile={output_path}',
            input_path
        ]
        subprocess.run(args, check=True)
        return True
    except Exception as e:
        print(f"Ghostscript error: {e}")
        return False

class PDFCompressorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("LaghuPdf by Twister Security")

        # Center the window and set a clear, visible size
        window_width, window_height = 500, 650
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = (screen_width // 2) - (window_width // 2)
        y = (screen_height // 2) - (window_height // 2)
        self.root.geometry(f"{window_width}x{window_height}+{x}+{y}")
        self.root.resizable(False, False)
        self.root.configure(bg='#f5f7fa')

        # Set window/taskbar icon if Icon.ico exists
        try:
            self.root.iconbitmap('Icon.ico')
        except Exception:
            pass  # Ignore if icon not supported or file missing

        self.input_paths = []
        self.output_path = ""
        self.quality = tk.StringVar(value='/ebook')
        self.color_dpi = tk.IntVar(value=100)
        self.gray_dpi = tk.IntVar(value=100)
        self.mono_dpi = tk.IntVar(value=100)
        self.jpeg_quality = tk.IntVar(value=50)

        # Shadow effect for main frame
        self.shadow = tk.Frame(root, bg='#b0bec5')
        self.shadow.place(x=14, y=14, width=window_width-28, height=window_height-28)
        self.main_frame = tk.Frame(root, bg='#f5f7fa', bd=0, highlightthickness=0)
        self.main_frame.place(x=0, y=0, width=window_width-14, height=window_height-14)
        self.main_frame.pack_propagate(False)

        self.label = tk.Label(self.main_frame, text="Select PDF files to compress:", bg='#f5f7fa', fg='#0d47a1', font=("Segoe UI", 14, "bold"), pady=8)
        self.label.pack(pady=(0, 8))

        # Button style with shadow and rounded corners
        def button_with_shadow(master, **kwargs):
            btn_frame = tk.Frame(master, bg='#b0bec5')
            btn_frame.pack(pady=5)
            btn = tk.Button(btn_frame, **kwargs, bd=0, relief='flat', highlightthickness=0, cursor='hand2',
                            font=("Segoe UI", 11, "bold"), padx=16, pady=6)
            btn.pack(padx=2, pady=2)
            btn.configure(bg=kwargs.get('bg', '#1976d2'), fg=kwargs.get('fg', 'white'),
                          activebackground=kwargs.get('activebackground', '#1565c0'),
                          activeforeground=kwargs.get('activeforeground', 'white'))
            btn.bind('<Enter>', lambda e: btn.config(bg='#1565c0'))
            btn.bind('<Leave>', lambda e: btn.config(bg=kwargs.get('bg', '#1976d2')))
            return btn

        self.select_btn = button_with_shadow(self.main_frame, text="Browse...", command=self.browse_file, bg='#1976d2', fg='white', activebackground='#1565c0', activeforeground='white')

        self.quality_label = tk.Label(self.main_frame, text="Compression Level:", bg='#f5f7fa', fg='#b71c1c', font=("Segoe UI", 11, "bold"), pady=4)
        self.quality_label.pack()
        # Use radio buttons for compression methods
        self.quality_options = [
            ('/screen', 'Maximum Compression (Screen)'),
            ('/ebook', 'Recommended (eBook)'),
            ('/printer', 'Good Quality (Printer)'),
            ('/prepress', 'High Quality (Prepress)'),
            ('/default', 'No Compression (Default)')
        ]
        self.quality_var = tk.StringVar(value=self.quality.get())
        self.quality_frame = tk.Frame(self.main_frame, bg='#f5f7fa')
        self.quality_frame.pack(pady=(0, 8))
        for val, label in self.quality_options:
            rb = tk.Radiobutton(self.quality_frame, text=label, variable=self.quality_var, value=val, bg='#f5f7fa', fg='#0d47a1', font=("Segoe UI", 10), activebackground='#e3eafc', activeforeground='#0d47a1', selectcolor='#e3eafc', indicatoron=1, borderwidth=0, highlightthickness=0, padx=8, pady=2)
            rb.pack(anchor='w', padx=10, pady=2)
        def update_quality(*args):
            self.quality.set(self.quality_var.get())
        self.quality_var.trace_add('write', update_quality)

        self.dpi_frame = tk.Frame(self.main_frame, bg='#f5f7fa')
        self.dpi_frame.pack(pady=5)
        tk.Label(self.dpi_frame, text="Color DPI:", bg='#f5f7fa', fg='#1976d2', font=("Segoe UI", 10, "bold")).grid(row=0, column=0, padx=(0,2))
        tk.Entry(self.dpi_frame, textvariable=self.color_dpi, width=5, bg='white', fg='#0d47a1', font=("Segoe UI", 10), bd=1, relief='solid').grid(row=0, column=1, padx=(0,8))
        tk.Label(self.dpi_frame, text="Gray DPI:", bg='#f5f7fa', fg='#1976d2', font=("Segoe UI", 10, "bold")).grid(row=0, column=2, padx=(0,2))
        tk.Entry(self.dpi_frame, textvariable=self.gray_dpi, width=5, bg='white', fg='#0d47a1', font=("Segoe UI", 10), bd=1, relief='solid').grid(row=0, column=3, padx=(0,8))
        tk.Label(self.dpi_frame, text="Mono DPI:", bg='#f5f7fa', fg='#1976d2', font=("Segoe UI", 10, "bold")).grid(row=0, column=4, padx=(0,2))
        tk.Entry(self.dpi_frame, textvariable=self.mono_dpi, width=5, bg='white', fg='#0d47a1', font=("Segoe UI", 10), bd=1, relief='solid').grid(row=0, column=5)

        self.jpegq_label = tk.Label(self.main_frame, text="JPEG Quality (10-95):", bg='#f5f7fa', fg='#b71c1c', font=("Segoe UI", 11, "bold"), pady=4)
        self.jpegq_label.pack()
        self.jpegq_scale = tk.Scale(self.main_frame, from_=10, to=95, orient=tk.HORIZONTAL, length=220, variable=self.jpeg_quality, bg='#e3eafc', fg='#0d47a1', highlightbackground='#e3eafc', troughcolor='#bbdefb', font=("Segoe UI", 10, "bold"), bd=0, relief='flat')
        self.jpegq_scale.pack(pady=(0, 8))

        self.compress_btn = button_with_shadow(self.main_frame, text="Compress PDF", command=self.compress_pdf, bg='#b71c1c', fg='white', activebackground='#d32f2f', activeforeground='white')

        self.status = tk.Label(self.main_frame, text="", fg='#1976d2', bg='#f5f7fa', font=("Segoe UI", 10, "italic"), pady=4)
        self.status.pack(pady=(10, 2))

        self.size_label = tk.Label(self.main_frame, text="", bg='#f5f7fa', fg='#0d47a1', font=("Segoe UI", 12, "bold"), pady=8, wraplength=440, justify='center', anchor='center')
        self.size_label.pack(pady=(2, 10), fill='x', padx=12)
        self.size_label.config(text="No file selected.")

        # Open Output Folder button (hidden by default, placed below size label)
        self.open_folder_btn = tk.Button(self.main_frame, text="Open Output Folder", command=self.open_output_folder, bg='#1976d2', fg='white', activebackground='#1565c0', activeforeground='white', font=("Segoe UI", 11, "bold"), bd=0, relief='flat', cursor='hand2')
        self.open_folder_btn_is_packed = False

        # Help/About button (always visible, top right, using place geometry)
        self.help_btn = tk.Button(self.main_frame, text="Help / About", command=self.show_help, bg='#e3eafc', fg='#0d47a1', activebackground='#bbdefb', activeforeground='#0d47a1', font=("Segoe UI", 10, "bold"), bd=0, relief='flat', cursor='hand2')
        self.help_btn.place(relx=1.0, x=-12, y=12, anchor='ne')

        # Enable drag and drop for PDF files
        def drop(event):
            files = self.root.tk.splitlist(event.data)
            pdf_files = [f for f in files if f.lower().endswith('.pdf')]
            if pdf_files:
                self.input_paths = list(pdf_files)
                if len(self.input_paths) == 1:
                    self.status.config(text=f"Selected: {os.path.basename(self.input_paths[0])}")
                    self.size_label.config(text=f"Original: {os.path.getsize(self.input_paths[0])//1024} KB")
                else:
                    self.status.config(text=f"Selected {len(self.input_paths)} files")
                    total_size = sum(os.path.getsize(f) for f in self.input_paths)
                    self.size_label.config(text=f"Total original size: {total_size//1024} KB")
                self.compress_btn.config(state=tk.NORMAL)
                if self.open_folder_btn_is_packed:
                    self.open_folder_btn.pack_forget()
                    self.open_folder_btn_is_packed = False

        # Register drag-and-drop events only if DND_AVAILABLE
        if DND_AVAILABLE:
            self.root.drop_target_register('DND_Files')
            self.root.dnd_bind('<<Drop>>', drop)

        # Check Ghostscript at startup
        self.check_ghostscript()

    def install_ghostscript(self):
        import webbrowser
        # Open the Ghostscript download page
        webbrowser.open('https://ghostscript.com/download/gsdnld.html')
        messagebox.showinfo(
            "Install Ghostscript",
            "1. Download and install Ghostscript from the opened web page.\n\n"
            "2. After installation, add the Ghostscript bin folder (e.g., C:/Program Files/gs/gs10.02.1/bin) to your system PATH.\n\n"
            "To add to PATH:\n"
            "- Open System Properties > Advanced > Environment Variables.\n"
            "- Under 'System variables', select 'Path' and click 'Edit'.\n"
            "- Click 'New' and paste the Ghostscript bin folder path.\n"
            "- Click OK to save.\n\n"
            "Restart this app after completing these steps."
        )

    def check_ghostscript(self):
        import shutil
        if not shutil.which(GHOSTSCRIPT_PATH):
            if messagebox.askyesno(
                "Ghostscript Not Found",
                "Ghostscript (gswin64c.exe) is not in your PATH.\n\nCompression will not work until Ghostscript is installed and available in your system PATH.\n\nWould you like to download and see instructions?"):
                self.install_ghostscript()

    def show_help(self):
        def open_email():
            import webbrowser
            webbrowser.open('mailto:devesh@twistersecurity.com')
        help_win = tk.Toplevel(self.root)
        help_win.title("Help / About")
        help_win.configure(bg='#f5f7fa')
        help_win.geometry("450x480")
        # Use a Text widget for bold headers
        text = tk.Text(help_win, bg='#f5f7fa', fg='#0d47a1', font=("Segoe UI", 10), wrap='word', borderwidth=0, highlightthickness=0)
        text.insert('end', "LaghuPdf by Twister Security\n\n", 'bold')
        text.insert('end', "How to Use:\n", 'bold')
        text.insert('end', "1. Click 'Browse...' to select PDF files.\n2. Choose a compression level and adjust DPI/JPEG quality as needed.\n3. Click 'Compress PDF' to save the compressed files.\n4. After compression, use 'Open Output Folder' to view the results.\n\n")
        text.insert('end', "Compression Levels:\n", 'bold')
        text.insert('end', "- Max Compression: Smallest file, lowest quality.\n- Recommended: Good balance for most PDFs.\n- Good Quality: Higher quality, larger file.\n- High Quality: Best for print, largest file.\n- No Compression: Only minor optimizations.\n\n")
        text.insert('end', "This app uses Ghostscript for robust PDF compression.\n\nNote: Ensure Ghostscript is installed and in your PATH.\nIf you encounter issues, please check the Ghostscript installation.\n\n")
        text.insert('end', "Programmer's Info:\n", 'bold')
        text.insert('end', "Name: Devesh Agarwal.\n")
        text.tag_configure('bold', font=("Segoe UI", 10, "bold"))
        text.config(state='disabled')
        text.pack(padx=16, pady=(6, 2), fill='both', expand=True)
        email_btn = tk.Label(help_win, text="Contact:techknowledgedev@gmail.com", fg="#1565c0", bg="#f5f7fa", cursor="hand2", font=("Segoe UI", 10, "underline"))
        email_btn.pack(padx=16, pady=(0, 16), anchor='w')
        email_btn.bind("<Button-1>", lambda e: open_email())

    def open_output_folder(self):
        if hasattr(self, 'output_path') and self.output_path:
            os.startfile(self.output_path)

    def browse_file(self):
        file_paths = filedialog.askopenfilenames(filetypes=[("PDF files", "*.pdf")])
        if file_paths:
            self.input_paths = list(file_paths)
            if len(self.input_paths) == 1:
                self.status.config(text=f"Selected: {os.path.basename(self.input_paths[0])}")
                self.size_label.config(text=f"Original: {os.path.getsize(self.input_paths[0])//1024} KB")
            else:
                self.status.config(text=f"Selected {len(self.input_paths)} files")
                total_size = sum(os.path.getsize(f) for f in self.input_paths)
                self.size_label.config(text=f"Total original size: {total_size//1024} KB")
            self.compress_btn.config(state=tk.NORMAL)
            if self.open_folder_btn_is_packed:
                self.open_folder_btn.pack_forget()
                self.open_folder_btn_is_packed = False

    def compress_pdf(self):
        if not hasattr(self, 'input_paths') or not self.input_paths:
            return
        output_dir = filedialog.askdirectory(title="Select Output Folder")
        if not output_dir:
            return
        total_orig = 0
        total_new = 0
        for input_path in self.input_paths:
            orig_filename = os.path.splitext(os.path.basename(input_path))[0]
            initialfile = f"{orig_filename}_c.pdf"
            output_path = os.path.join(output_dir, initialfile)
            orig_size = os.path.getsize(input_path)
            total_orig += orig_size
            self.status.config(text=f"Compressing {os.path.basename(input_path)}...")
            self.root.update()
            success = compress_pdf_with_gs(
                input_path,
                output_path,
                self.quality.get(),
                self.color_dpi.get(),
                self.gray_dpi.get(),
                self.mono_dpi.get(),
                self.jpeg_quality.get()
            )
            if success and os.path.exists(output_path):
                new_size = os.path.getsize(output_path)
                total_new += new_size
            else:
                messagebox.showerror("Error", f"Failed to compress {os.path.basename(input_path)}.\nIs Ghostscript installed and in your PATH?")
        if len(self.input_paths) == 1:
            percent = 100 * total_new / total_orig if total_orig else 0
            self.size_label.config(text=f"Original: {total_orig//1024} KB\nCompressed: {total_new//1024} KB ({percent:.1f}% of original)")
        else:
            percent = 100 * total_new / total_orig if total_orig else 0
            self.size_label.config(text=f"Total original: {total_orig//1024} KB\nTotal compressed: {total_new//1024} KB ({percent:.1f}% of original)\nOutput folder: {output_dir}")
        self.status.config(text="Compression complete!")
        self.output_path = output_dir
        if not self.open_folder_btn_is_packed:
            self.open_folder_btn.pack(after=self.size_label, pady=(0, 16))
            self.open_folder_btn_is_packed = True

def main():
    # Use DnD-enabled root if available, else fallback to normal Tk
    if DND_AVAILABLE:
        root = tkdnd.TkinterDnD.Tk()
    else:
        root = tk.Tk()
    app = PDFCompressorApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
