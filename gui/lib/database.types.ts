export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          department_id: string
          code: string
          name: string
          description: string | null
          parent_department_id: string | null
          level: number
          hierarchy_path: string | null
          default_shift_start: number
          default_shift_end: number
          overtime_allowed: boolean
          cost_center: string | null
          manager_operator_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          department_id?: string
          code: string
          name: string
          description?: string | null
          parent_department_id?: string | null
          level?: number
          hierarchy_path?: string | null
          default_shift_start?: number
          default_shift_end?: number
          overtime_allowed?: boolean
          cost_center?: string | null
          manager_operator_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          department_id?: string
          code?: string
          name?: string
          description?: string | null
          parent_department_id?: string | null
          level?: number
          hierarchy_path?: string | null
          default_shift_start?: number
          default_shift_end?: number
          overtime_allowed?: boolean
          cost_center?: string | null
          manager_operator_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      job_optimized_patterns: {
        Row: {
          pattern_id: string
          name: string
          description: string | null
          task_count: number
          total_min_duration_minutes: number
          critical_path_length_minutes: number
          baseline_performance_seconds: number | null
          optimized_performance_seconds: number | null
          speedup_factor: number | null
          last_benchmarked_at: string | null
          performance_target_seconds: number | null
          solver_parameters: any
          optimization_techniques_applied: string[] | null
          symmetry_breaking_enabled: boolean
          redundant_constraints_count: number
          is_blessed: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          pattern_id?: string
          name: string
          description?: string | null
          task_count?: number
          total_min_duration_minutes?: number
          critical_path_length_minutes?: number
          baseline_performance_seconds?: number | null
          optimized_performance_seconds?: number | null
          speedup_factor?: number | null
          last_benchmarked_at?: string | null
          performance_target_seconds?: number | null
          solver_parameters?: any
          optimization_techniques_applied?: string[] | null
          symmetry_breaking_enabled?: boolean
          redundant_constraints_count?: number
          is_blessed?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          pattern_id?: string
          name?: string
          description?: string | null
          task_count?: number
          total_min_duration_minutes?: number
          critical_path_length_minutes?: number
          baseline_performance_seconds?: number | null
          optimized_performance_seconds?: number | null
          speedup_factor?: number | null
          last_benchmarked_at?: string | null
          performance_target_seconds?: number | null
          solver_parameters?: any
          optimization_techniques_applied?: string[] | null
          symmetry_breaking_enabled?: boolean
          redundant_constraints_count?: number
          is_blessed?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      optimized_tasks: {
        Row: {
          optimized_task_id: string
          pattern_id: string
          name: string
          position: number
          department_id: string | null
          is_unattended: boolean
          is_setup: boolean
          sequence_id: string | null
          min_operators: number
          max_operators: number
          operator_efficiency_curve: string | null
          created_at: string
        }
        Insert: {
          optimized_task_id?: string
          pattern_id: string
          name: string
          position?: number
          department_id?: string | null
          is_unattended?: boolean
          is_setup?: boolean
          sequence_id?: string | null
          min_operators?: number
          max_operators?: number
          operator_efficiency_curve?: string | null
          created_at?: string
        }
        Update: {
          optimized_task_id?: string
          pattern_id?: string
          name?: string
          position?: number
          department_id?: string | null
          is_unattended?: boolean
          is_setup?: boolean
          sequence_id?: string | null
          min_operators?: number
          max_operators?: number
          operator_efficiency_curve?: string | null
          created_at?: string
        }
      }
      optimized_precedences: {
        Row: {
          precedence_id: string
          pattern_id: string
          predecessor_task_id: string
          successor_task_id: string
          created_at: string
        }
        Insert: {
          precedence_id?: string
          pattern_id: string
          predecessor_task_id: string
          successor_task_id: string
          created_at?: string
        }
        Update: {
          precedence_id?: string
          pattern_id?: string
          predecessor_task_id?: string
          successor_task_id?: string
          created_at?: string
        }
      }
      machines: {
        Row: {
          machine_resource_id: string
          name: string
          capacity: number
          cost_per_hour: number
          department_id: string | null
          cell_id: string
          setup_time_minutes: number
          teardown_time_minutes: number
          maintenance_window_start: number | null
          maintenance_window_end: number | null
          last_maintenance_date: string | null
          next_maintenance_due: string | null
          maintenance_interval_hours: number
          machine_type: string | null
          manufacturer: string | null
          model: string | null
          year_installed: number | null
          efficiency_rating: number
          average_utilization_percent: number | null
          uptime_target_percent: number
          calendar_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          machine_resource_id?: string
          name: string
          capacity?: number
          cost_per_hour?: number
          department_id?: string | null
          cell_id: string
          setup_time_minutes?: number
          teardown_time_minutes?: number
          maintenance_window_start?: number | null
          maintenance_window_end?: number | null
          last_maintenance_date?: string | null
          next_maintenance_due?: string | null
          maintenance_interval_hours?: number
          machine_type?: string | null
          manufacturer?: string | null
          model?: string | null
          year_installed?: number | null
          efficiency_rating?: number
          average_utilization_percent?: number | null
          uptime_target_percent?: number
          calendar_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          machine_resource_id?: string
          name?: string
          capacity?: number
          cost_per_hour?: number
          department_id?: string | null
          cell_id?: string
          setup_time_minutes?: number
          teardown_time_minutes?: number
          maintenance_window_start?: number | null
          maintenance_window_end?: number | null
          last_maintenance_date?: string | null
          next_maintenance_due?: string | null
          maintenance_interval_hours?: number
          machine_type?: string | null
          manufacturer?: string | null
          model?: string | null
          year_installed?: number | null
          efficiency_rating?: number
          average_utilization_percent?: number | null
          uptime_target_percent?: number
          calendar_id?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      optimized_task_setup_times: {
        Row: {
          setup_time_id: string
          from_optimized_task_id: string
          to_optimized_task_id: string
          machine_resource_id: string
          setup_time_minutes: number
          setup_type: string
          complexity_level: string
          requires_operator_skill: string | null
          requires_certification: boolean
          requires_supervisor_approval: boolean
          setup_cost: number
          efficiency_impact_percent: number
          product_family_from: string | null
          product_family_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          setup_time_id?: string
          from_optimized_task_id: string
          to_optimized_task_id: string
          machine_resource_id: string
          setup_time_minutes: number
          setup_type?: string
          complexity_level?: string
          requires_operator_skill?: string | null
          requires_certification?: boolean
          requires_supervisor_approval?: boolean
          setup_cost?: number
          efficiency_impact_percent?: number
          product_family_from?: string | null
          product_family_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          setup_time_id?: string
          from_optimized_task_id?: string
          to_optimized_task_id?: string
          machine_resource_id?: string
          setup_time_minutes?: number
          setup_type?: string
          complexity_level?: string
          requires_operator_skill?: string | null
          requires_certification?: boolean
          requires_supervisor_approval?: boolean
          setup_cost?: number
          efficiency_impact_percent?: number
          product_family_from?: string | null
          product_family_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      template_task_setup_times: {
        Row: {
          setup_time_id: string
          from_template_task_id: string
          to_template_task_id: string
          machine_resource_id: string
          setup_time_minutes: number
          setup_type: string
          complexity_level: string
          requires_operator_skill: string | null
          requires_certification: boolean
          requires_supervisor_approval: boolean
          setup_cost: number
          efficiency_impact_percent: number
          product_family_from: string | null
          product_family_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          setup_time_id?: string
          from_template_task_id: string
          to_template_task_id: string
          machine_resource_id: string
          setup_time_minutes: number
          setup_type?: string
          complexity_level?: string
          requires_operator_skill?: string | null
          requires_certification?: boolean
          requires_supervisor_approval?: boolean
          setup_cost?: number
          efficiency_impact_percent?: number
          product_family_from?: string | null
          product_family_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          setup_time_id?: string
          from_template_task_id?: string
          to_template_task_id?: string
          machine_resource_id?: string
          setup_time_minutes?: number
          setup_type?: string
          complexity_level?: string
          requires_operator_skill?: string | null
          requires_certification?: boolean
          requires_supervisor_approval?: boolean
          setup_cost?: number
          efficiency_impact_percent?: number
          product_family_from?: string | null
          product_family_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      template_tasks: {
        Row: {
          template_task_id: string
          template_id: string
          name: string
          position: number
          department_id: string | null
          is_unattended: boolean
          is_setup: boolean
          sequence_id: string | null
          requires_certification: boolean
          min_skill_level: string
          min_operators: number
          max_operators: number
          operator_efficiency_curve: string
          requires_business_hours: boolean
          allows_overtime: boolean
          created_at: string
        }
        Insert: {
          template_task_id?: string
          template_id: string
          name: string
          position: number
          department_id?: string | null
          is_unattended?: boolean
          is_setup?: boolean
          sequence_id?: string | null
          requires_certification?: boolean
          min_skill_level?: string
          min_operators?: number
          max_operators?: number
          operator_efficiency_curve?: string
          requires_business_hours?: boolean
          allows_overtime?: boolean
          created_at?: string
        }
        Update: {
          template_task_id?: string
          template_id?: string
          name?: string
          position?: number
          department_id?: string | null
          is_unattended?: boolean
          is_setup?: boolean
          sequence_id?: string | null
          requires_certification?: boolean
          min_skill_level?: string
          min_operators?: number
          max_operators?: number
          operator_efficiency_curve?: string
          requires_business_hours?: boolean
          allows_overtime?: boolean
          created_at?: string
        }
      }
      work_cells: {
        Row: {
          cell_id: string
          name: string
          capacity: number
          department_id: string | null
          wip_limit: number | null
          target_utilization: number
          flow_priority: number
          floor_location: string | null
          cell_type: string
          calendar_id: string | null
          average_throughput_per_hour: number | null
          utilization_target_percent: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          cell_id?: string
          name: string
          capacity?: number
          department_id?: string | null
          wip_limit?: number | null
          target_utilization?: number
          flow_priority?: number
          floor_location?: string | null
          cell_type?: string
          calendar_id?: string | null
          average_throughput_per_hour?: number | null
          utilization_target_percent?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          cell_id?: string
          name?: string
          capacity?: number
          department_id?: string | null
          wip_limit?: number | null
          target_utilization?: number
          flow_priority?: number
          floor_location?: string | null
          cell_type?: string
          calendar_id?: string | null
          average_throughput_per_hour?: number | null
          utilization_target_percent?: number
          is_active?: boolean
          created_at?: string
        }
      }
      business_calendars: {
        Row: {
          calendar_id: string
          name: string
          description: string | null
          timezone: string
          default_start_time: number
          default_end_time: number
          working_days_mask: number
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          calendar_id?: string
          name: string
          description?: string | null
          timezone?: string
          default_start_time?: number
          default_end_time?: number
          working_days_mask?: number
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          name?: string
          description?: string | null
          timezone?: string
          default_start_time?: number
          default_end_time?: number
          working_days_mask?: number
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      operators: {
        Row: {
          operator_id: string
          name: string
          employee_number: string | null
          department_id: string | null
          hourly_rate: number
          max_hours_per_day: number
          max_hours_per_week: number
          overtime_rate_multiplier: number
          supervisor_id: string | null
          hire_date: string | null
          employment_status: string
          efficiency_rating: number
          quality_score: number
          safety_score: number
          calendar_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          operator_id?: string
          name: string
          employee_number?: string | null
          department_id?: string | null
          hourly_rate?: number
          max_hours_per_day?: number
          max_hours_per_week?: number
          overtime_rate_multiplier?: number
          supervisor_id?: string | null
          hire_date?: string | null
          employment_status?: string
          efficiency_rating?: number
          quality_score?: number
          safety_score?: number
          calendar_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          operator_id?: string
          name?: string
          employee_number?: string | null
          department_id?: string | null
          hourly_rate?: number
          max_hours_per_day?: number
          max_hours_per_week?: number
          overtime_rate_multiplier?: number
          supervisor_id?: string | null
          hire_date?: string | null
          employment_status?: string
          efficiency_rating?: number
          quality_score?: number
          safety_score?: number
          calendar_id?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      skills: {
        Row: {
          skill_id: string
          name: string
          description: string | null
          category: string | null
          department_id: string | null
          complexity_level: string
          training_hours_required: number
          certification_required: boolean
          certification_expires_after_months: number | null
          market_hourly_rate: number | null
          skill_scarcity_level: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          skill_id?: string
          name: string
          description?: string | null
          category?: string | null
          department_id?: string | null
          complexity_level?: string
          training_hours_required?: number
          certification_required?: boolean
          certification_expires_after_months?: number | null
          market_hourly_rate?: number | null
          skill_scarcity_level?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          skill_id?: string
          name?: string
          description?: string | null
          category?: string | null
          department_id?: string | null
          complexity_level?: string
          training_hours_required?: number
          certification_required?: boolean
          certification_expires_after_months?: number | null
          market_hourly_rate?: number | null
          skill_scarcity_level?: string
          is_active?: boolean
          created_at?: string
        }
      }
      sequence_resources: {
        Row: {
          sequence_id: string
          name: string
          description: string | null
          department_id: string | null
          setup_time_minutes: number
          teardown_time_minutes: number
          max_concurrent_jobs: number
          resource_type: string
          capacity: number
          utilization_target_percent: number
          calendar_id: string | null
          priority: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          sequence_id: string
          name: string
          description?: string | null
          department_id?: string | null
          setup_time_minutes?: number
          teardown_time_minutes?: number
          max_concurrent_jobs?: number
          resource_type?: string
          capacity?: number
          utilization_target_percent?: number
          calendar_id?: string | null
          priority?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          sequence_id?: string
          name?: string
          description?: string | null
          department_id?: string | null
          setup_time_minutes?: number
          teardown_time_minutes?: number
          max_concurrent_jobs?: number
          resource_type?: string
          capacity?: number
          utilization_target_percent?: number
          calendar_id?: string | null
          priority?: number
          is_active?: boolean
          created_at?: string
        }
      }
      maintenance_types: {
        Row: {
          maintenance_type_id: string
          name: string
          description: string | null
          is_preventive: boolean
          is_emergency: boolean
          typical_duration_hours: number
          blocks_production: boolean
          allows_emergency_override: boolean
          requires_shutdown: boolean
          required_skill_level: string | null
          requires_external_vendor: boolean
          created_at: string
        }
        Insert: {
          maintenance_type_id?: string
          name: string
          description?: string | null
          is_preventive?: boolean
          is_emergency?: boolean
          typical_duration_hours?: number
          blocks_production?: boolean
          allows_emergency_override?: boolean
          requires_shutdown?: boolean
          required_skill_level?: string | null
          requires_external_vendor?: boolean
          created_at?: string
        }
        Update: {
          maintenance_type_id?: string
          name?: string
          description?: string | null
          is_preventive?: boolean
          is_emergency?: boolean
          typical_duration_hours?: number
          blocks_production?: boolean
          allows_emergency_override?: boolean
          requires_shutdown?: boolean
          required_skill_level?: string | null
          requires_external_vendor?: boolean
          created_at?: string
        }
      }
      job_instances: {
        Row: {
          instance_id: string
          template_id: string
          name: string
          department_id: string | null
          priority: number
          due_date: string | null
          earliest_start_date: string
          customer_order_id: string | null
          batch_id: string | null
          quantity: number
          estimated_cost: number | null
          actual_cost: number | null
          revenue_value: number | null
          status: string
          estimated_duration_hours: number | null
          actual_duration_hours: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          instance_id?: string
          template_id: string
          name: string
          department_id?: string | null
          priority?: number
          due_date?: string | null
          earliest_start_date?: string
          customer_order_id?: string | null
          batch_id?: string | null
          quantity?: number
          estimated_cost?: number | null
          actual_cost?: number | null
          revenue_value?: number | null
          status?: string
          estimated_duration_hours?: number | null
          actual_duration_hours?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          instance_id?: string
          template_id?: string
          name?: string
          department_id?: string | null
          priority?: number
          due_date?: string | null
          earliest_start_date?: string
          customer_order_id?: string | null
          batch_id?: string | null
          quantity?: number
          estimated_cost?: number | null
          actual_cost?: number | null
          revenue_value?: number | null
          status?: string
          estimated_duration_hours?: number | null
          actual_duration_hours?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Type aliases for common use
export type TemplateTask = Database['public']['Tables']['template_tasks']['Row']