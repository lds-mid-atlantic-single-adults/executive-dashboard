param(
  [string]$Server = "LAPTOP",
  [string]$Database = "BV",
  [string]$QueryPath = "scripts/export_sql_server.sql",
  [string]$RawOut = "data/sql-source-rows.json",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$queryFile = Join-Path $root $QueryPath
$outFile = Join-Path $root $RawOut

if (-not (Test-Path $queryFile)) {
  throw "Query file not found: $queryFile"
}

New-Item -ItemType Directory -Force (Split-Path -Parent $outFile) | Out-Null

Add-Type -AssemblyName System.Data
$query = Get-Content -LiteralPath $queryFile -Raw
$connectionString = "Server=$Server;Database=$Database;Integrated Security=SSPI;Encrypt=False;TrustServerCertificate=True;Connection Timeout=30;"

$connection = New-Object System.Data.SqlClient.SqlConnection $connectionString
$command = $connection.CreateCommand()
$command.CommandText = $query
$command.CommandTimeout = 120

$table = New-Object System.Data.DataTable
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter $command

try {
  [void]$adapter.Fill($table)
}
finally {
  $connection.Close()
}

$rows = foreach ($row in $table.Rows) {
  $item = [ordered]@{}
  foreach ($column in $table.Columns) {
    $value = $row[$column.ColumnName]
    $item[$column.ColumnName] = if ($value -is [System.DBNull]) { $null } else { $value }
  }
  $item
}

$payload = [ordered]@{
  exportedAt = [DateTime]::UtcNow.ToString("o")
  server = $Server
  database = $Database
  sourceQuery = $QueryPath
  rowCount = $table.Rows.Count
  rows = $rows
}

$payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $outFile -Encoding UTF8
Write-Host "Exported $($table.Rows.Count) source rows to $outFile"

if (-not $SkipBuild) {
  python (Join-Path $root "scripts/build_static_data.py") --raw $outFile
}
