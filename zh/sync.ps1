param(
  [int]$DebounceSeconds = 8
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Publish-Changes {
  $changes = git status --porcelain
  if (-not $changes) { return }
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  git add -A
  git commit -m "sync: $stamp"
  git push origin main
  Write-Host "Published $stamp" -ForegroundColor Green
}

Publish-Changes
$watcher = New-Object IO.FileSystemWatcher $root -Property @{ IncludeSubdirectories = $true; NotifyFilter = [IO.NotifyFilters]'FileName, LastWrite, Size, DirectoryName' }
$watcher.EnableRaisingEvents = $true
Register-ObjectEvent -InputObject $watcher -EventName Changed | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Created | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Deleted | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Renamed | Out-Null
$lastPublish = [DateTime]::MinValue

while ($true) {
  $event = Wait-Event -Timeout 2
  if (-not $event) { continue }
  Remove-Event -EventIdentifier $event.EventIdentifier
  if ($event.SourceEventArgs.FullPath -match '\\.git(\\|$)') { continue }
  if (((Get-Date) - $lastPublish).TotalSeconds -lt $DebounceSeconds) { continue }
  Start-Sleep -Seconds $DebounceSeconds
  Publish-Changes
  $lastPublish = Get-Date
}
