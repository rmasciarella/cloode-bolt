"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Building2, Factory, Users, Calendar, BookTemplate as FileTemplate, Network, Cog, Settings, Clock, Wrench, BriefcaseIcon, ListTodo, Menu, X } from 'lucide-react'
import DepartmentForm from '@/components/forms/DepartmentForm'
import JobTemplateForm from '@/components/forms/JobTemplateForm'
import MachineForm from '@/components/forms/MachineForm'
import SetupTimeForm from '@/components/forms/SetupTimeForm'
import TemplateTaskForm from '@/components/forms/TemplateTaskForm'
import WorkCellForm from '@/components/forms/WorkCellForm'
import BusinessCalendarForm from '@/components/forms/BusinessCalendarForm'
import OperatorForm from '@/components/forms/OperatorForm'
import SkillForm from '@/components/forms/SkillForm'
import SequenceResourceForm from '@/components/forms/SequenceResourceForm'
import MaintenanceTypeForm from '@/components/forms/MaintenanceTypeForm'
import JobInstanceForm from '@/components/forms/JobInstanceForm'
import TemplatePrecedenceForm from '@/components/forms/TemplatePrecedenceForm'
import JobTaskForm from '@/components/forms/JobTaskForm'

const navigationSections = [
  {
    title: 'Organization',
    icon: Building2,
    items: [
      { key: 'departments', label: 'Departments', icon: Building2 },
      { key: 'work-cells', label: 'Work Cells', icon: Factory },
      { key: 'business-calendars', label: 'Business Calendars', icon: Calendar },
    ]
  },
  {
    title: 'Templates',
    icon: FileTemplate,
    items: [
      { key: 'job-templates', label: 'Job Templates', icon: FileTemplate },
      { key: 'template-tasks', label: 'Template Tasks', icon: ListTodo },
      { key: 'template-precedences', label: 'Template Precedences', icon: Network },
    ]
  },
  {
    title: 'Resources',
    icon: Cog,
    items: [
      { key: 'machines', label: 'Machines', icon: Cog },
      { key: 'operators', label: 'Operators', icon: Users },
      { key: 'skills', label: 'Skills', icon: Settings },
      { key: 'sequence-resources', label: 'Sequence Resources', icon: Network },
    ]
  },
  {
    title: 'Scheduling',
    icon: Clock,
    items: [
      { key: 'setup-times', label: 'Setup Times', icon: Clock },
      { key: 'maintenance-windows', label: 'Maintenance Types', icon: Wrench },
    ]
  },
  {
    title: 'Jobs',
    icon: BriefcaseIcon,
    items: [
      { key: 'job-instances', label: 'Job Instances', icon: BriefcaseIcon },
      { key: 'job-tasks', label: 'Job Tasks', icon: ListTodo },
    ]
  },
]

export default function Home() {
  const [activeSection, setActiveSection] = useState('departments')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Organization': true,
    'Templates': false,
    'Resources': false,
    'Scheduling': false,
    'Jobs': false,
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }))
  }

  const renderForm = () => {
    switch (activeSection) {
      case 'departments':
        return <DepartmentForm />
      case 'job-templates':
        return <JobTemplateForm />
      case 'machines':
        return <MachineForm />
      case 'setup-times':
        return <SetupTimeForm />
      case 'template-tasks':
        return <TemplateTaskForm />
      case 'work-cells':
        return <WorkCellForm />
      case 'business-calendars':
        return <BusinessCalendarForm />
      case 'operators':
        return <OperatorForm />
      case 'skills':
        return <SkillForm />
      case 'sequence-resources':
        return <SequenceResourceForm />
      case 'maintenance-windows':
        return <MaintenanceTypeForm />
      case 'job-instances':
        return <JobInstanceForm />
      case 'template-precedences':
        return <TemplatePrecedenceForm />
      case 'job-tasks':
        return <JobTaskForm />
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Select a form from the sidebar to get started</p>
          </div>
        )
    }
  }

  const getSectionTitle = () => {
    for (const section of navigationSections) {
      const item = section.items.find(item => item.key === activeSection)
      if (item) {
        return item.label
      }
    }
    return 'Fresh Solver OR-Tools'
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-white rounded-md shadow-md hover:bg-gray-50 transition-colors"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Fresh Solver</h1>
            <p className="text-sm text-gray-600 mt-1">OR-Tools Scheduling System</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {navigationSections.map((section) => (
              <div key={section.title} className="mb-2">
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center justify-between w-full px-6 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <section.icon className="mr-3 h-5 w-5 text-gray-500" />
                    {section.title}
                  </div>
                  <div className={cn(
                    "transform transition-transform duration-200",
                    expandedSections[section.title] ? "rotate-90" : "rotate-0"
                  )}>
                    ▶
                  </div>
                </button>
                
                {expandedSections[section.title] && (
                  <div className="ml-4 border-l border-gray-200">
                    {section.items.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => {
                          setActiveSection(item.key)
                          setSidebarOpen(false)
                        }}
                        className={cn(
                          "flex items-center w-full pl-8 pr-6 py-2 text-sm transition-colors",
                          activeSection === item.key
                            ? "text-blue-700 bg-blue-50 border-r-2 border-blue-700"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        <item.icon className="mr-3 h-4 w-4" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p>Version 1.0.0</p>
              <p>Manufacturing Scheduling</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center">
            <h2 className="text-2xl font-semibold text-gray-900 ml-12 lg:ml-0">
              {getSectionTitle()}
            </h2>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl">
            {renderForm()}
          </div>
        </main>
      </div>
    </div>
  )
}