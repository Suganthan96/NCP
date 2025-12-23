import WorkflowBuilder from "@/components/workflow-builder"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Navigation Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">No-Code-Permission  </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/agents">
                <Button variant="outline" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  My Agents
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1">
        <WorkflowBuilder />
      </div>
    </main>
  )
}
