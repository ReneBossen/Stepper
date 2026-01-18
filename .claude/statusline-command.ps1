# Read JSON input from stdin pipeline
$inputJson = $input | Out-String

# Parse JSON
$json = $inputJson | ConvertFrom-Json

# Extract model name
$model_name = $json.model.display_name
if (-not $model_name) {
    $model_name = $json.model.id
}
if (-not $model_name) {
    $model_name = "Model"
}

# Try workspace paths
$project_dir = $json.workspace.project_dir
if (-not $project_dir) {
    $project_dir = $json.workspace.current_dir
}
if (-not $project_dir) {
    $project_dir = $json.cwd
}
if (-not $project_dir) {
    $project_dir = "."
}

# Get git branch
$git_branch = ""
try {
    Push-Location $project_dir
    $git_branch = git branch --show-current 2>$null
    Pop-Location
} catch {
    $git_branch = ""
}

# Get project name (basename of project directory)
$project_name = Split-Path -Leaf $project_dir

# Colors (ANSI escape sequences) - use [char]27 for compatibility with PowerShell 5.1
$esc = [char]27
$cyan = "$esc[1;36m"
$green = "$esc[1;32m"
$blue = "$esc[1;34m"
$reset = "$esc[0m"
$dim = "$esc[2m"

# Build status line
$output = ""

# Add model name if available
if ($model_name) {
    $output += "${cyan}${model_name}${reset}"
}

# Add git branch if available
if ($git_branch) {
    if ($output) {
        $output += " ${dim}|${reset} "
    }
    $output += "${green}${git_branch}${reset}"
}

# Add project name if available
if ($project_name -and $project_name -ne ".") {
    if ($output) {
        $output += " ${dim}|${reset} "
    }
    $output += "${blue}${project_name}${reset}"
}

[Console]::Write($output)
