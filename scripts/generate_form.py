#!/usr/bin/env python3
"""
Generate new form component following Fresh Solver patterns.
"""

import sys
from pathlib import Path
import re

FORM_TEMPLATE = '''import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

// Zod schema for {entity_name}
const {entity_lower}Schema = z.object({{
  {form_fields}
}})

type {entity_name}FormData = z.infer<typeof {entity_lower}Schema>

interface {entity_name}FormProps {{
  onSuccess?: () => void
  initialData?: Partial<{entity_name}FormData>
}}

export function {entity_name}Form({{ onSuccess, initialData }}: {entity_name}FormProps) {{
  const form = useForm<{entity_name}FormData>({{
    resolver: zodResolver({entity_lower}Schema),
    defaultValues: {{
      {default_values}
      ...initialData,
    }},
  }})

  const onSubmit = async (data: {entity_name}FormData) => {{
    try {{
      const {{ error }} = await supabase
        .from('{table_name}')
        .insert([data])

      if (error) throw error

      toast.success('{entity_name} created successfully!')
      form.reset()
      onSuccess?.()
    }} catch (error) {{
      console.error('Error creating {entity_lower}:', error)
      toast.error('Failed to create {entity_lower}')
    }}
  }}

  return (
    <Form {{...form}}>
      <form onSubmit={{form.handleSubmit(onSubmit)}} className="space-y-6">
        {form_components}
        
        <Button type="submit" className="w-full">
          Create {entity_name}
        </Button>
      </form>
    </Form>
  )
}}
'''

FIELD_TEMPLATES = {
    'text': '''        <FormField
          control={form.control}
          name="{field_name}"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{field_label}</FormLabel>
              <FormControl>
                <Input placeholder="Enter {field_label.lower()}" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />''',
    'textarea': '''        <FormField
          control={form.control}
          name="{field_name}"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{field_label}</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter {field_label.lower()}" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />''',
    'number': '''        <FormField
          control={form.control}
          name="{field_name}"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{field_label}</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="Enter {field_label.lower()}" 
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />'''
}

def to_pascal_case(text: str) -> str:
    """Convert text to PascalCase."""
    return ''.join(word.capitalize() for word in re.split(r'[_\s-]', text))

def to_snake_case(text: str) -> str:
    """Convert text to snake_case."""
    return re.sub(r'[^a-zA-Z0-9]', '_', text.lower())

def generate_form(entity_name: str, fields: list[tuple[str, str, str]]):
    """Generate form component code."""
    entity_lower = entity_name.lower()
    table_name = to_snake_case(entity_name + 's')  # Pluralize for table name
    
    # Generate Zod schema fields
    zod_fields = []
    default_values = []
    form_components = []
    
    for field_name, field_type, field_label in fields:
        # Zod schema
        if field_type == 'number':
            zod_fields.append(f"  {field_name}: z.number().min(0)")
            default_values.append(f"      {field_name}: 0,")
        elif field_type == 'textarea':
            zod_fields.append(f"  {field_name}: z.string().min(1)")
            default_values.append(f"      {field_name}: '',")
        else:  # text
            zod_fields.append(f"  {field_name}: z.string().min(1)")
            default_values.append(f"      {field_name}: '',")
        
        # Form component
        template = FIELD_TEMPLATES[field_type]
        form_components.append(template.format(
            field_name=field_name,
            field_label=field_label
        ))
    
    # Fill in template
    code = FORM_TEMPLATE.format(
        entity_name=entity_name,
        entity_lower=entity_lower,
        table_name=table_name,
        form_fields=',\\n'.join(zod_fields),
        default_values='\\n'.join(default_values),
        form_components='\\n\\n'.join(form_components)
    )
    
    return code

def main():
    """Main form generator."""
    if len(sys.argv) < 2:
        print("Usage: python scripts/generate_form.py <EntityName>")
        print("Interactive mode will prompt for fields.")
        sys.exit(1)
    
    entity_name = to_pascal_case(sys.argv[1])
    
    print(f"Generating form for: {entity_name}")
    print("Enter fields (field_name:type:label), type 'done' when finished:")
    print("Types: text, textarea, number")
    
    fields = []
    while True:
        field_input = input("Field: ").strip()
        if field_input.lower() == 'done':
            break
        
        try:
            field_name, field_type, field_label = field_input.split(':')
            if field_type not in ['text', 'textarea', 'number']:
                print("Invalid type. Use: text, textarea, number")
                continue
            fields.append((field_name.strip(), field_type.strip(), field_label.strip()))
        except ValueError:
            print("Format: field_name:type:label")
            continue
    
    if not fields:
        print("No fields specified. Exiting.")
        sys.exit(1)
    
    # Generate form code
    code = generate_form(entity_name, fields)
    
    # Write to file
    output_path = Path(f"gui/components/forms/{entity_name}Form.tsx")
    output_path.write_text(code)
    
    print(f"Generated: {output_path}")
    print(f"Don't forget to add to your navigation and import!")

if __name__ == "__main__":
    main()