import { useSkillsContext } from '@/contexts/SkillsContext'
import { Button } from '@/components/ui/button'

export function ChartControls() {
  const {
    chartViewHistory,
    chartViewData,
    isChartOverview,
    chartGoBack,
    chartResetToOverview,
  } = useSkillsContext()

  const showBack = chartViewHistory.length > 0
  const showReset = !isChartOverview
  const breadcrumb =
    chartViewData && !isChartOverview && 'name' in chartViewData
      ? chartViewData.name
      : null

  if (!showBack && !showReset && !breadcrumb) return null

  return (
    <div className="w-full max-w-2xl flex flex-wrap items-center gap-3 bg-white rounded-xl shadow-lg px-4 py-3">
      {showBack && (
        <Button variant="outline" size="sm" onClick={chartGoBack}>
          ← Back
        </Button>
      )}
      {showReset && (
        <Button variant="outline" size="sm" onClick={chartResetToOverview}>
          ⌂ Reset to Overview
        </Button>
      )}
      {breadcrumb && (
        <span className="text-sm font-medium text-gray-700">
          Current: {breadcrumb}
        </span>
      )}
    </div>
  )
}
