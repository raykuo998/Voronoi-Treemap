import { useState } from 'react'
import { VoronoiChart, type DomainLabelPosition } from '@/components/VoronoiChart'
import { ChartControls } from '@/components/ChartControls'
import { SkillsTableContainer } from '@/components/SkillsTableContainer'
import { Badge } from '@/components/ui/badge'
import { CHART_WIDTH, CHART_HEIGHT } from '@/lib/chart-utils'

export default function App() {
  const [domainPositions, setDomainPositions] = useState<DomainLabelPosition[]>([])
  const centerX = CHART_WIDTH / 2
  const centerY = CHART_HEIGHT / 2

  return (
    <div className="flex flex-col items-center gap-5">
      <h1 className="text-white text-center text-3xl font-bold drop-shadow-md">
        Programming Skills Map
      </h1>
      <p className="text-white/90 text-center text-lg">
        Skills grouped by domain - Interactive skill tree visualization
      </p>
      <div className="text-center">
        <span className="bg-white/20 px-4 py-2 rounded-full text-sm backdrop-blur-sm">
          Skill Map: Competencies within Technical Domains
        </span>
      </div>

      <ChartControls />
      <div className="w-full bg-white rounded-xl shadow-lg p-6 flex justify-center items-center">
        <div className="relative" style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}>
          <VoronoiChart onDomainPositionsChange={setDomainPositions} />
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            {domainPositions.map((d) => (
              <div
                key={d.domainName}
                className="absolute"
                style={{
                  left: centerX + d.x,
                  top: centerY + d.y,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <Badge
                  className="border-0 text-white shadow-md text-base font-semibold"
                  style={{ backgroundColor: d.color }}
                >
                  {d.domainName}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SkillsTableContainer />
    </div>
  )
}
