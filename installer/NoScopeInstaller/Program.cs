using Microsoft.Win32;
using System.Diagnostics;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;

namespace NoScopeInstaller;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        try
        {
            ApplicationConfiguration.Initialize();
            bool smokeTest = args.Any(arg => string.Equals(arg, "--smoke-test", StringComparison.OrdinalIgnoreCase));
            bool uninstallMode =
#if UNINSTALLER_ONLY
                true
#else
                false
#endif
                || args.Any(arg => string.Equals(arg, "--uninstall", StringComparison.OrdinalIgnoreCase));

            if (smokeTest)
            {
                using InstallerForm form = new(uninstallMode);
                form.CreateControl();
                return;
            }

            Application.Run(new InstallerForm(uninstallMode));
        }
        catch (Exception error)
        {
            MessageBox.Show(error.ToString(), "NoScope Installer Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}

internal sealed class InstallerForm : Form
{
    private const string AppName = "NoScope";
    private const string AppVersion = "2.3.0";
    private const int TitleBarHeight = 40;
    private static readonly Color AppBackground = Color.FromArgb(13, 15, 22);
    private static readonly Color SidebarBackground = Color.FromArgb(8, 10, 15);
    private static readonly Color PanelBackground = Color.FromArgb(18, 21, 30);
    private static readonly Color TitleBarBackground = Color.FromArgb(8, 10, 15);
    private static readonly Color BorderColor = Color.FromArgb(55, 62, 76);
    private static readonly Color MutedText = Color.FromArgb(178, 187, 201);
    private static readonly Color BrightText = Color.FromArgb(245, 248, 252);
    private static readonly Color NoScopeRed = Color.FromArgb(239, 48, 71);
    private static readonly Color NoScopeRedDark = Color.FromArgb(170, 26, 44);

    private readonly bool uninstallMode;
    private readonly TextBox installPath = new();
    private readonly Button primaryButton = new();
    private readonly Button browseButton = new();
    private readonly Button closeButton = new();
    private readonly ToggleOption desktopShortcut = new();
    private readonly ToggleOption startMenuShortcut = new();
    private readonly Panel progressTrack = new();
    private readonly Panel progressFill = new();
    private readonly Label title = new();
    private readonly Label subtitle = new();
    private readonly Label status = new();
    private bool completed;

    public InstallerForm(bool uninstallMode)
    {
        this.uninstallMode = uninstallMode;
        BuildLayout();
        ShowReadyState();
    }

    private void BuildLayout()
    {
        Text = uninstallMode ? "Uninstall NoScope" : "Install NoScope";
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.None;
        MaximizeBox = false;
        AutoScaleMode = AutoScaleMode.Dpi;
        ClientSize = new Size(780, 600);
        Size fixedWindowSize = SizeFromClientSize(ClientSize);
        MinimumSize = fixedWindowSize;
        MaximumSize = fixedWindowSize;
        BackColor = AppBackground;
        Font = new Font("Segoe UI", 9F);
        SetStyle(ControlStyles.ResizeRedraw, true);

        using Stream? iconStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("NoScopeIcon.png");
        if (iconStream is not null)
        {
            using Image iconImage = Image.FromStream(iconStream);
            Icon = Icon.FromHandle(new Bitmap(iconImage, 64, 64).GetHicon());
        }

        Panel titleBar = new()
        {
            Location = new Point(0, 0),
            Size = new Size(ClientSize.Width, TitleBarHeight),
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
            BackColor = TitleBarBackground
        };
        titleBar.MouseDown += DragWindow;
        Controls.Add(titleBar);

        PictureBox titleIcon = new()
        {
            Size = new Size(20, 20),
            Location = new Point(14, 10),
            SizeMode = PictureBoxSizeMode.Zoom,
            BackColor = Color.Transparent
        };
        using Stream? titleIconStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("NoScopeIcon.png");
        if (titleIconStream is not null) titleIcon.Image = Image.FromStream(titleIconStream);
        titleIcon.MouseDown += DragWindow;
        titleBar.Controls.Add(titleIcon);

        Label titleText = NewLabel(Text, 9, FontStyle.Regular, BrightText);
        titleText.Location = new Point(42, 9);
        titleText.Size = new Size(300, 22);
        titleText.MouseDown += DragWindow;
        titleBar.Controls.Add(titleText);

        Button minimizeButton = CreateWindowButton("—");
        minimizeButton.Location = new Point(ClientSize.Width - 92, 0);
        minimizeButton.Anchor = AnchorStyles.Top | AnchorStyles.Right;
        minimizeButton.Click += (_, _) => WindowState = FormWindowState.Minimized;
        titleBar.Controls.Add(minimizeButton);

        Button closeWindowButton = CreateWindowButton("×");
        closeWindowButton.Location = new Point(ClientSize.Width - 46, 0);
        closeWindowButton.Anchor = AnchorStyles.Top | AnchorStyles.Right;
        closeWindowButton.FlatAppearance.MouseOverBackColor = NoScopeRed;
        closeWindowButton.FlatAppearance.MouseDownBackColor = NoScopeRedDark;
        closeWindowButton.Click += (_, _) => Close();
        titleBar.Controls.Add(closeWindowButton);

        Panel sidebar = new()
        {
            Location = new Point(0, TitleBarHeight),
            Size = new Size(260, ClientSize.Height - TitleBarHeight),
            Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left,
            BackColor = SidebarBackground
        };
        Controls.Add(sidebar);

        PictureBox logo = new()
        {
            Size = new Size(126, 126),
            Location = new Point(66, 54),
            SizeMode = PictureBoxSizeMode.Zoom,
            BackColor = Color.Transparent
        };
        using Stream? logoStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("NoScope.png");
        if (logoStream is not null) logo.Image = Image.FromStream(logoStream);
        sidebar.Controls.Add(logo);

        Panel accent = new()
        {
            Width = 5,
            Dock = DockStyle.Left,
            BackColor = NoScopeRed
        };
        sidebar.Controls.Add(accent);

        title.Location = new Point(310, 96);
        title.Size = new Size(410, 45);
        title.Font = new Font("Segoe UI", 22F, FontStyle.Bold);
        title.ForeColor = BrightText;
        Controls.Add(title);

        subtitle.Location = new Point(313, 148);
        subtitle.Size = new Size(395, 56);
        subtitle.Font = new Font("Segoe UI", 10F);
        subtitle.ForeColor = MutedText;
        Controls.Add(subtitle);

        Label pathLabel = NewLabel("Install location", 9, FontStyle.Bold, Color.FromArgb(218, 226, 236));
        pathLabel.Location = new Point(314, 228);
        pathLabel.Size = new Size(180, 22);
        Controls.Add(pathLabel);

        installPath.Location = new Point(316, 256);
        installPath.Size = new Size(310, 27);
        installPath.BorderStyle = BorderStyle.FixedSingle;
        installPath.BackColor = PanelBackground;
        installPath.ForeColor = BrightText;
        Controls.Add(installPath);

        browseButton.Text = "Browse";
        browseButton.Location = new Point(638, 254);
        browseButton.Size = new Size(86, 31);
        StyleButton(browseButton, false);
        browseButton.Click += (_, _) => BrowseInstallPath();
        Controls.Add(browseButton);

        desktopShortcut.Location = new Point(316, 310);
        desktopShortcut.Size = new Size(240, 24);
        desktopShortcut.Label = "Create desktop shortcut";
        desktopShortcut.Checked = true;
        Controls.Add(desktopShortcut);

        startMenuShortcut.Location = new Point(316, 342);
        startMenuShortcut.Size = new Size(250, 24);
        startMenuShortcut.Label = "Create Start menu shortcut";
        startMenuShortcut.Checked = true;
        Controls.Add(startMenuShortcut);

        progressTrack.Location = new Point(316, 412);
        progressTrack.Size = new Size(408, 14);
        progressTrack.BackColor = Color.FromArgb(40, 45, 56);
        progressTrack.BorderStyle = BorderStyle.None;
        progressFill.Location = new Point(0, 0);
        progressFill.Size = new Size(0, 14);
        progressFill.BackColor = NoScopeRed;
        progressTrack.Controls.Add(progressFill);
        Controls.Add(progressTrack);

        status.Location = new Point(316, 445);
        status.Size = new Size(408, 56);
        status.ForeColor = MutedText;
        Controls.Add(status);

        primaryButton.Size = new Size(136, 38);
        StyleButton(primaryButton, true);
        primaryButton.Click += PrimaryButton_Click;
        Controls.Add(primaryButton);

        closeButton.Text = "Cancel";
        closeButton.Size = new Size(96, 38);
        StyleButton(closeButton, false);
        closeButton.Click += (_, _) => Close();
        Controls.Add(closeButton);

        LayoutFooterControls();
        ClientSizeChanged += (_, _) => LayoutFooterControls();
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        using Pen borderPen = new(BorderColor, 1);
        e.Graphics.DrawRectangle(borderPen, 0, 0, ClientSize.Width - 1, ClientSize.Height - 1);
    }

    private static Label NewLabel(string text, float size, FontStyle style, Color color)
    {
        return new Label
        {
            Text = text,
            Font = new Font("Segoe UI", size, style),
            ForeColor = color,
            BackColor = Color.Transparent
        };
    }

    private static void StyleButton(Button button, bool primary)
    {
        button.FlatStyle = FlatStyle.Flat;
        button.FlatAppearance.BorderSize = 1;
        button.FlatAppearance.BorderColor = primary ? NoScopeRed : BorderColor;
        button.FlatAppearance.MouseOverBackColor = primary ? Color.FromArgb(255, 69, 93) : Color.FromArgb(31, 36, 48);
        button.FlatAppearance.MouseDownBackColor = primary ? NoScopeRedDark : Color.FromArgb(23, 27, 37);
        button.BackColor = primary ? NoScopeRed : Color.FromArgb(24, 29, 39);
        button.ForeColor = primary ? Color.White : BrightText;
        button.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
        button.Cursor = Cursors.Hand;
    }

    private static Button CreateWindowButton(string text)
    {
        Button button = new()
        {
            Text = text,
            Size = new Size(46, TitleBarHeight),
            FlatStyle = FlatStyle.Flat,
            BackColor = TitleBarBackground,
            ForeColor = BrightText,
            Font = new Font("Segoe UI", 12F, FontStyle.Regular),
            TabStop = false,
            Cursor = Cursors.Hand
        };
        button.FlatAppearance.BorderSize = 0;
        button.FlatAppearance.MouseOverBackColor = Color.FromArgb(28, 32, 42);
        button.FlatAppearance.MouseDownBackColor = Color.FromArgb(20, 23, 31);
        return button;
    }

    private void DragWindow(object? sender, MouseEventArgs eventArgs)
    {
        if (eventArgs.Button != MouseButtons.Left) return;
        ReleaseCapture();
        SendMessage(Handle, 0xA1, 0x2, 0);
    }

    private void LayoutFooterControls()
    {
        const int footerMargin = 22;
        int y = ClientSize.Height - primaryButton.Height - footerMargin;
        primaryButton.Location = new Point(ClientSize.Width - primaryButton.Width - 56, y);
        closeButton.Location = new Point(primaryButton.Left - closeButton.Width - 14, y);
    }

    [DllImport("user32.dll")]
    private static extern bool ReleaseCapture();

    [DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);

    [DllImport("shell32.dll")]
    private static extern void SHChangeNotify(uint wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);

    private void ShowReadyState()
    {
        SetProgress(0);

        if (uninstallMode)
        {
            title.Text = "Remove NoScope";
            subtitle.Text = "Remove the desktop app, shortcuts, and Windows uninstall entry.";
            installPath.Text = GetInstalledPath() ?? GetDefaultInstallPath();
            desktopShortcut.Visible = false;
            startMenuShortcut.Visible = false;
            browseButton.Enabled = false;
            installPath.ReadOnly = true;
            primaryButton.Text = "Uninstall";
            status.Text = "Ready to remove NoScope from this Windows user profile.";
            return;
        }

        string? installedPath = GetInstalledPath();
        bool updatingExistingInstall = !string.IsNullOrWhiteSpace(installedPath);
        title.Text = updatingExistingInstall ? "Update NoScope" : "Install NoScope";
        subtitle.Text = updatingExistingInstall
            ? "Update the installed desktop editor while keeping the same install location."
            : "Install the standalone desktop editor with local file access and native save dialogs.";
        installPath.Text = installedPath ?? GetDefaultInstallPath();
        primaryButton.Text = updatingExistingInstall ? "Update" : "Install";
        status.Text = updatingExistingInstall
            ? "NoScope is already installed. The installer will update this location."
            : "NoScope installs per-user, so administrator permission should not be required.";
    }

    private async void PrimaryButton_Click(object? sender, EventArgs eventArgs)
    {
        if (completed)
        {
            if (!uninstallMode) LaunchNoScope(installPath.Text.Trim());
            Close();
            return;
        }

        await RunPrimaryAction();
    }

    private async Task RunPrimaryAction()
    {
        SetBusy(true);
        try
        {
            if (uninstallMode) await Task.Run(() => Uninstall(UpdateProgress));
            else await Task.Run(() => Install(installPath.Text.Trim(), desktopShortcut.Checked, startMenuShortcut.Checked, UpdateProgress));

            SetProgress(100);
            title.Text = uninstallMode ? "NoScope removed" : "NoScope is ready";
            subtitle.Text = uninstallMode
                ? "The app and shortcuts were removed from this profile."
                : "The desktop app was installed successfully.";
            status.Text = uninstallMode ? "Uninstall complete." : "Install complete. You can launch NoScope now.";
            primaryButton.Text = uninstallMode ? "Close" : "Launch";
            closeButton.Text = "Close";
            primaryButton.Enabled = true;
            closeButton.Enabled = true;
            UseWaitCursor = false;
            completed = true;
        }
        catch (Exception error)
        {
            status.Text = error.Message;
            MessageBox.Show(this, error.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
            SetBusy(false);
        }
    }

    private void SetBusy(bool busy)
    {
        primaryButton.Enabled = !busy;
        browseButton.Enabled = !busy && !uninstallMode;
        installPath.Enabled = !busy;
        desktopShortcut.Enabled = !busy;
        startMenuShortcut.Enabled = !busy;
        closeButton.Enabled = !busy;
        if (busy) SetProgress(3);
        UseWaitCursor = busy;
    }

    private void BrowseInstallPath()
    {
        using FolderBrowserDialog dialog = new()
        {
            Description = "Choose where NoScope should be installed",
            SelectedPath = installPath.Text
        };

        if (dialog.ShowDialog(this) == DialogResult.OK)
        {
            installPath.Text = Path.Combine(dialog.SelectedPath, AppName);
        }
    }

    private void UpdateProgress(int percent, string message)
    {
        if (InvokeRequired)
        {
            BeginInvoke(new Action(() => UpdateProgress(percent, message)));
            return;
        }

        SetProgress(percent);
        status.Text = message;
    }

    private void SetProgress(int percent)
    {
        int safePercent = Math.Clamp(percent, 0, 100);
        int fillWidth = (int)Math.Round(progressTrack.Width * safePercent / 100d);
        progressFill.Width = Math.Clamp(fillWidth, 0, progressTrack.Width);
    }

    private static string GetDefaultInstallPath()
    {
        string localPrograms = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs");
        return Path.Combine(localPrograms, AppName);
    }

    private static string? GetInstalledPath()
    {
        using RegistryKey? key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\NoScope");
        return key?.GetValue("InstallLocation") as string;
    }

    private static void Install(string targetDirectory, bool createDesktopShortcut, bool createStartMenuShortcut, Action<int, string> report)
    {
        if (string.IsNullOrWhiteSpace(targetDirectory)) throw new InvalidOperationException("Choose an install location.");

        string installRoot = Path.GetFullPath(targetDirectory);
        Directory.CreateDirectory(installRoot);
        WaitForInstalledAppToClose(installRoot, report);

        using Stream payload = Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip")
            ?? throw new InvalidOperationException("Installer payload is missing. Rebuild with npm run custom-installer.");
        using ZipArchive archive = new(payload, ZipArchiveMode.Read);

        ZipArchiveEntry[] files = archive.Entries.Where(entry => !string.IsNullOrEmpty(entry.Name)).ToArray();
        for (int index = 0; index < files.Length; index++)
        {
            ZipArchiveEntry entry = files[index];
            string destination = Path.GetFullPath(Path.Combine(installRoot, entry.FullName));
            if (!destination.StartsWith(installRoot, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Installer payload contains an unsafe path.");
            }

            Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
            entry.ExtractToFile(destination, true);
            int percent = 8 + (int)Math.Round((index + 1) * 76d / Math.Max(files.Length, 1));
            report(percent, $"Installing {entry.Name}...");
        }

        string exePath = Path.Combine(installRoot, "NoScope.exe");
        if (!File.Exists(exePath)) throw new FileNotFoundException("NoScope.exe was not found after extraction.", exePath);
        string iconPath = WriteAppIconFile(installRoot);

        if (createDesktopShortcut)
        {
            string desktopLink = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "NoScope.lnk");
            TryDeleteFile(desktopLink);
            Shortcut.Create(desktopLink, exePath, installRoot, "NoScope", iconPath);
        }
        report(88, "Creating shortcuts...");

        if (createStartMenuShortcut)
        {
            string menuDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "NoScope");
            Directory.CreateDirectory(menuDir);
            string menuLink = Path.Combine(menuDir, "NoScope.lnk");
            TryDeleteFile(menuLink);
            Shortcut.Create(menuLink, exePath, installRoot, "NoScope", iconPath);
        }
        RefreshShellIcons();

        string uninstallerPath = WriteUninstallerExecutable(installRoot);
        WriteUninstallRegistry(installRoot, iconPath);
        report(94, "Installing uninstaller...");
        report(100, "Install complete.");
    }

    private static void WaitForInstalledAppToClose(string installRoot, Action<int, string> report)
    {
        string installedExe = Path.GetFullPath(Path.Combine(installRoot, "NoScope.exe"));
        DateTime deadline = DateTime.UtcNow.AddSeconds(20);
        bool requestedClose = false;

        while (DateTime.UtcNow < deadline)
        {
            Process[] runningApps = Process.GetProcessesByName("NoScope")
                .Where(process => IsProcessRunningFrom(process, installedExe))
                .ToArray();

            if (runningApps.Length == 0) return;

            report(6, "Waiting for NoScope to close...");
            foreach (Process process in runningApps)
            {
                try
                {
                    if (!requestedClose && process.MainWindowHandle != IntPtr.Zero) process.CloseMainWindow();
                }
                catch
                {
                    // Process information can disappear while the app is closing.
                }
                finally
                {
                    process.Dispose();
                }
            }

            requestedClose = true;
            Thread.Sleep(500);
        }

        throw new InvalidOperationException("NoScope is still running. Close every NoScope window and run the installer again.");
    }

    private static bool IsProcessRunningFrom(Process process, string installedExe)
    {
        try
        {
            string? processPath = process.MainModule?.FileName;
            return string.Equals(Path.GetFullPath(processPath ?? ""), installedExe, StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    private static void Uninstall(Action<int, string> report)
    {
        string installRoot = GetInstalledPath() ?? GetDefaultInstallPath();
        report(20, "Removing shortcuts...");

        TryDeleteFile(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "NoScope.lnk"));
        TryDeleteDirectory(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "NoScope"));

        report(45, "Removing app files...");
        ScheduleDirectoryRemoval(installRoot);

        report(80, "Cleaning uninstall entry...");
        Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\NoScope", false);
        RefreshShellIcons();
        report(100, "Uninstall complete.");
    }

    private static void WriteUninstallRegistry(string installRoot, string iconPath)
    {
        string uninstallerPath = Path.Combine(installRoot, "NoScope-Uninstaller.exe");
        using RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\NoScope");
        key.SetValue("DisplayName", "NoScope");
        key.SetValue("DisplayVersion", AppVersion);
        key.SetValue("Publisher", "NoScope");
        key.SetValue("InstallLocation", installRoot);
        key.SetValue("DisplayIcon", iconPath);
        key.SetValue("UninstallString", $"\"{uninstallerPath}\"");
        key.SetValue("NoModify", 1, RegistryValueKind.DWord);
        key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
    }

    private static string WriteAppIconFile(string installRoot)
    {
        string iconPath = Path.Combine(installRoot, "NoScopeIcon.ico");
        using Stream icon = Assembly.GetExecutingAssembly().GetManifestResourceStream("NoScopeIcon.ico")
            ?? throw new InvalidOperationException("Bundled NoScope icon is missing. Rebuild with npm run custom-installer.");
        using FileStream file = File.Create(iconPath);
        icon.CopyTo(file);
        return iconPath;
    }

    private static string WriteUninstallerExecutable(string installRoot)
    {
        string uninstallerPath = Path.Combine(installRoot, "NoScope-Uninstaller.exe");
        using Stream uninstaller = Assembly.GetExecutingAssembly().GetManifestResourceStream("uninstaller.exe")
            ?? throw new InvalidOperationException("Bundled uninstaller is missing. Rebuild with npm run custom-installer.");
        using FileStream file = File.Create(uninstallerPath);
        uninstaller.CopyTo(file);
        return uninstallerPath;
    }

    private static void ScheduleDirectoryRemoval(string installRoot)
    {
        string command = $"/c timeout /t 1 /nobreak >nul & rmdir /s /q \"{installRoot}\"";
        Process.Start(new ProcessStartInfo
        {
            FileName = Environment.GetEnvironmentVariable("ComSpec") ?? "cmd.exe",
            Arguments = command,
            WindowStyle = ProcessWindowStyle.Hidden,
            CreateNoWindow = true,
            UseShellExecute = false
        });
    }

    private static void RefreshShellIcons()
    {
        SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
    }

    private static void LaunchNoScope(string installRoot)
    {
        string exePath = Path.Combine(installRoot, "NoScope.exe");
        if (!File.Exists(exePath)) return;
        Process.Start(new ProcessStartInfo
        {
            FileName = exePath,
            WorkingDirectory = installRoot,
            UseShellExecute = true
        });
    }

    private static void TryDeleteFile(string path)
    {
        try
        {
            if (File.Exists(path)) File.Delete(path);
        }
        catch
        {
            // Best-effort cleanup.
        }
    }

    private static void TryDeleteDirectory(string path)
    {
        try
        {
            if (Directory.Exists(path)) Directory.Delete(path, true);
        }
        catch
        {
            // Best-effort cleanup.
        }
    }
}

internal sealed class ToggleOption : Control
{
    private static readonly Color NoScopeRed = Color.FromArgb(239, 48, 71);
    private static readonly Color NoScopeRedDark = Color.FromArgb(170, 26, 44);
    private static readonly Color BorderColor = Color.FromArgb(76, 84, 98);
    private static readonly Color TextColor = Color.FromArgb(245, 248, 252);
    private static readonly Color MutedText = Color.FromArgb(178, 187, 201);
    private bool isHovered;
    private bool isPressed;
    private bool isChecked;

    public ToggleOption()
    {
        SetStyle(
            ControlStyles.UserPaint
            | ControlStyles.AllPaintingInWmPaint
            | ControlStyles.OptimizedDoubleBuffer
            | ControlStyles.ResizeRedraw
            | ControlStyles.Selectable,
            true
        );
        Cursor = Cursors.Hand;
        BackColor = Color.FromArgb(13, 15, 22);
        Font = new Font("Segoe UI", 9F, FontStyle.Regular);
        TabStop = true;
    }

    public string Label
    {
        get => Text;
        set
        {
            Text = value;
            Invalidate();
        }
    }

    public bool Checked
    {
        get => isChecked;
        set
        {
            if (isChecked == value) return;
            isChecked = value;
            Invalidate();
        }
    }

    protected override void OnClick(EventArgs e)
    {
        base.OnClick(e);
        if (!Enabled) return;
        Checked = !Checked;
    }

    protected override void OnKeyDown(KeyEventArgs e)
    {
        base.OnKeyDown(e);
        if (e.KeyCode is Keys.Space or Keys.Enter)
        {
            Checked = !Checked;
            e.Handled = true;
        }
    }

    protected override void OnMouseEnter(EventArgs e)
    {
        base.OnMouseEnter(e);
        isHovered = true;
        Invalidate();
    }

    protected override void OnMouseLeave(EventArgs e)
    {
        base.OnMouseLeave(e);
        isHovered = false;
        isPressed = false;
        Invalidate();
    }

    protected override void OnMouseDown(MouseEventArgs e)
    {
        base.OnMouseDown(e);
        if (e.Button != MouseButtons.Left) return;
        Focus();
        isPressed = true;
        Invalidate();
    }

    protected override void OnMouseUp(MouseEventArgs e)
    {
        base.OnMouseUp(e);
        isPressed = false;
        Invalidate();
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        Graphics graphics = e.Graphics;
        graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
        graphics.Clear(Parent?.BackColor ?? Color.FromArgb(13, 15, 22));

        Rectangle box = new(1, 4, 16, 16);
        Color fill = Checked ? (isPressed ? NoScopeRedDark : NoScopeRed) : Color.FromArgb(23, 27, 37);
        if (!Enabled) fill = Color.FromArgb(35, 38, 46);
        if (!Checked && isHovered) fill = Color.FromArgb(31, 36, 48);

        using SolidBrush fillBrush = new(fill);
        using Pen borderPen = new(Checked ? NoScopeRed : BorderColor, 1);
        graphics.FillRectangle(fillBrush, box);
        graphics.DrawRectangle(borderPen, box);

        if (Checked)
        {
            using Pen checkPen = new(Color.White, 2)
            {
                StartCap = System.Drawing.Drawing2D.LineCap.Round,
                EndCap = System.Drawing.Drawing2D.LineCap.Round
            };
            graphics.DrawLines(checkPen, new[]
            {
                new Point(box.Left + 4, box.Top + 8),
                new Point(box.Left + 7, box.Top + 11),
                new Point(box.Left + 12, box.Top + 5)
            });
        }

        Color labelColor = Enabled ? TextColor : MutedText;
        TextRenderer.DrawText(
            graphics,
            Label,
            Font,
            new Rectangle(26, 1, Width - 28, Height - 2),
            labelColor,
            TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis
        );

        if (Focused)
        {
            using Pen focusPen = new(Color.FromArgb(125, 239, 48, 71), 1) { DashStyle = System.Drawing.Drawing2D.DashStyle.Dot };
            graphics.DrawRectangle(focusPen, new Rectangle(0, 0, Width - 1, Height - 1));
        }
    }
}

internal static class Shortcut
{
    public static void Create(string shortcutPath, string targetPath, string workingDirectory, string description, string iconPath)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(shortcutPath)!);
        Type shellLinkType = Type.GetTypeFromCLSID(new Guid("00021401-0000-0000-C000-000000000046"))
            ?? throw new InvalidOperationException("Unable to initialize Windows shortcut support.");
        IShellLinkW link = (IShellLinkW)(Activator.CreateInstance(shellLinkType)
            ?? throw new InvalidOperationException("Unable to create a Windows shortcut."));
        link.SetPath(targetPath);
        link.SetWorkingDirectory(workingDirectory);
        link.SetDescription(description);
        link.SetIconLocation(iconPath, 0);
        ((IPersistFile)link).Save(shortcutPath, true);
    }
}

[ComImport]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
[Guid("000214F9-0000-0000-C000-000000000046")]
internal interface IShellLinkW
{
    void GetPath(IntPtr pszFile, int cchMaxPath, IntPtr pfd, uint fFlags);
    void GetIDList(out IntPtr ppidl);
    void SetIDList(IntPtr pidl);
    void GetDescription(IntPtr pszName, int cchMaxName);
    void SetDescription([MarshalAs(UnmanagedType.LPWStr)] string pszName);
    void GetWorkingDirectory(IntPtr pszDir, int cchMaxPath);
    void SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string pszDir);
    void GetArguments(IntPtr pszArgs, int cchMaxPath);
    void SetArguments([MarshalAs(UnmanagedType.LPWStr)] string pszArgs);
    void GetHotkey(out short pwHotkey);
    void SetHotkey(short wHotkey);
    void GetShowCmd(out int piShowCmd);
    void SetShowCmd(int iShowCmd);
    void GetIconLocation(IntPtr pszIconPath, int cchIconPath, out int piIcon);
    void SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string pszIconPath, int iIcon);
    void SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string pszPathRel, uint dwReserved);
    void Resolve(IntPtr hwnd, uint fFlags);
    void SetPath([MarshalAs(UnmanagedType.LPWStr)] string pszFile);
}

[ComImport]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
[Guid("0000010b-0000-0000-C000-000000000046")]
internal interface IPersistFile
{
    void GetClassID(out Guid pClassID);
    void IsDirty();
    void Load([MarshalAs(UnmanagedType.LPWStr)] string pszFileName, uint dwMode);
    void Save([MarshalAs(UnmanagedType.LPWStr)] string pszFileName, bool fRemember);
    void SaveCompleted([MarshalAs(UnmanagedType.LPWStr)] string pszFileName);
    void GetCurFile([MarshalAs(UnmanagedType.LPWStr)] out string ppszFileName);
}
