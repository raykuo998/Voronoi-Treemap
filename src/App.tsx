import { VoronoiChart } from '@/components/VoronoiChart'
import { ChartControls } from '@/components/ChartControls'
import { SkillsTableContainer } from '@/components/SkillsTableContainer'

export default function App() {
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
        <VoronoiChart />
      </div>

      <SkillsTableContainer />
    </div>
  )
}
