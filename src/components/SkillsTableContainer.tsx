import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SkillTable } from '@/components/SkillTable'
import { PersonTable } from '@/components/PersonTable'

export function SkillsTableContainer() {
  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-4">
      <Tabs defaultValue="skill" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="skill">By Skill</TabsTrigger>
          <TabsTrigger value="person">By Person</TabsTrigger>
        </TabsList>
        <TabsContent value="skill">
          <SkillTable />
        </TabsContent>
        <TabsContent value="person">
          <PersonTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
