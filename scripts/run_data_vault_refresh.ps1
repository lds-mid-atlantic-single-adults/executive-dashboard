param(
  [string]$Server = "LAPTOP",
  [string]$Database = "BV"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sqlFiles = @(
  "sql\00_create_schemas.sql",
  "sql\01_data_vault_tables.sql",
  "sql\02_load_vault_from_staging.sql",
  "sql\03_business_vault_and_im.sql",
  "sql\04_existing_masc_sources_to_im.sql"
)

foreach ($relative in $sqlFiles) {
  $path = Join-Path $root $relative
  Write-Host "Running $relative"
  sqlcmd -S $Server -d $Database -E -b -i $path
}

Write-Host "Data Vault and IM refresh complete."
