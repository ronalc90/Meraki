export async function downloadExcel(type: string, params?: Record<string, string>) {
  const query = new URLSearchParams({ type, ...params }).toString()
  const res = await fetch(`/api/export?${query}`)
  if (!res.ok) throw new Error('Error al exportar')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `meraki-${type}-${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
