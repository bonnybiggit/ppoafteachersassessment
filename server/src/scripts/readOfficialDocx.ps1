param([Parameter(Mandatory=$true)][string]$Source)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($Source)
try {
  function Read-Part([string]$Name) {
    $reader = [IO.StreamReader]::new($zip.GetEntry($Name).Open())
    try { [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
  }
  $document = Read-Part 'word/document.xml'
  $numbering = Read-Part 'word/numbering.xml'
  $ns = [Xml.XmlNamespaceManager]::new($document.NameTable)
  $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
  $counts = @{}
  $index = 0
  $result = @(foreach ($paragraph in $document.SelectNodes('//w:body//w:p', $ns)) {
    $index++
    $text = ($paragraph.SelectNodes('.//w:t | .//w:br | .//w:tab', $ns) | ForEach-Object {
      $node = $_
      switch ($node.LocalName) { 't' { $node.InnerText } 'br' { "`n" } 'tab' { "`t" } }
    }) -join ''
    $num = $paragraph.SelectSingleNode('w:pPr/w:numPr/w:numId', $ns)
    $resolved = $null
    if ($num) {
      $id = $num.GetAttribute('val', $ns.LookupNamespace('w'))
      $levelNode = $paragraph.SelectSingleNode('w:pPr/w:numPr/w:ilvl', $ns)
      $level = if ($levelNode) { $levelNode.GetAttribute('val', $ns.LookupNamespace('w')) } else { '0' }
      $definition = $numbering.SelectSingleNode("//w:num[@w:numId='$id']", $ns)
      $abstract = $definition.SelectSingleNode('w:abstractNumId', $ns).GetAttribute('val', $ns.LookupNamespace('w'))
      $lvl = $numbering.SelectSingleNode("//w:abstractNum[@w:abstractNumId='$abstract']/w:lvl[@w:ilvl='$level']", $ns)
      if ($lvl.SelectSingleNode('w:numFmt', $ns).GetAttribute('val', $ns.LookupNamespace('w')) -eq 'decimal') {
        $start = $definition.SelectSingleNode("w:lvlOverride[@w:ilvl='$level']/w:startOverride", $ns)
        if (!$start) { $start = $lvl.SelectSingleNode('w:start', $ns) }
        $key = "$id/$level"
        if (!$counts.ContainsKey($key)) { $counts[$key] = [int]$start.GetAttribute('val', $ns.LookupNamespace('w')) } else { $counts[$key]++ }
        $resolved = $counts[$key]
      }
    }
    [ordered]@{ paragraph = $index; text = $text; number = $resolved }
  })
  ConvertTo-Json -InputObject $result -Depth 5 -Compress
} finally { $zip.Dispose() }
