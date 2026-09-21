"use client";

import { useState } from "react";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import InputWrapper from "./forms/fields/InputWrapper";
import {
  ComboboxFieldWrapper,
  type ComboboxOption,
  MultiComboboxWrapper,
} from "./forms/fields/ComboboxWrapper";

// Define option sets
const frameworks: ComboboxOption[] = [
  { id: "next.js", name: "Next.js" },
  { id: "sveltekit", name: "SvelteKit" },
  { id: "nuxt.js", name: "Nuxt.js" },
  { id: "remix", name: "Remix" },
  { id: "astro", name: "Astro" },
  { id: "react", name: "React" },
  { id: "vue", name: "Vue.js" },
  { id: "angular", name: "Angular" },
  { id: "svelte", name: "Svelte" },
  { id: "gatsby", name: "Gatsby" },
];

const languages: ComboboxOption[] = [
  { id: "typescript", name: "TypeScript" },
  { id: "javascript", name: "JavaScript" },
  { id: "python", name: "Python" },
  { id: "java", name: "Java" },
  { id: "csharp", name: "C#" },
  { id: "go", name: "Go" },
  { id: "rust", name: "Rust" },
  { id: "php", name: "PHP" },
];

const countries: ComboboxOption[] = [
  { id: "us", name: "United States" },
  { id: "uk", name: "United Kingdom" },
  { id: "ca", name: "Canada" },
  { id: "au", name: "Australia" },
  { id: "de", name: "Germany" },
  { id: "fr", name: "France" },
  { id: "jp", name: "Japan" },
];

const skills: ComboboxOption[] = [
  { id: "frontend", name: "Frontend Development" },
  { id: "backend", name: "Backend Development" },
  { id: "devops", name: "DevOps & Cloud" },
  { id: "database", name: "Database Design" },
  { id: "graphql", name: "GraphQL & APIs" },
  { id: "testing", name: "Testing & QA" },
];

const interests: ComboboxOption[] = [
  { id: "cloud", name: "Cloud Architecture" },
  { id: "ai", name: "Artificial Intelligence" },
  { id: "security", name: "Cybersecurity" },
  { id: "perf", name: "Performance Optimization" },
];

// Yup validation schema following frontend rules
const formSchema = yup.object({
  name: yup.string().trim().required("Project name is required.").min(2, "Must be at least 2 characters."),
  email: yup.string().trim().email("Please enter a valid email address.").required("Email is required."),
  framework: yup.string().required("Please select a framework."),
  language: yup.string().required("Please select a programming language."),
  country: yup.string().required("Please select a country."),
  skills: yup
    .array()
    .of(yup.string().required())
    .min(2, "Please select at least 2 skills.")
    .max(5, "Please select no more than 5 skills.")
    .required("Skills are required."),
  interests: yup
    .array()
    .of(yup.string().required())
    .min(1, "Please select at least 1 interest.")
    .required("Interests are required."),
});

type FormData = yup.InferType<typeof formSchema>;

export default function FormSheet() {
  const [open, setOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: yupResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      framework: "",
      language: "",
      country: "",
      skills: [],
      interests: [],
    },
  });

  function onSubmit(data: FormData) {
    toast.success("Project created successfully!", {
      description: `Created project ${data.name} using ${data.framework}.`,
    });
    setOpen(false);
    form.reset();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          Create New Project
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Create New Project</SheetTitle>
          <SheetDescription>
            Fill out the form below to set up your new project.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] pr-4 mt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <InputWrapper
                control={form.control}
                name="name"
                label="Project Name"
                type="text"
                required
                warning="This will be the name of your project."
              />

              <InputWrapper
                control={form.control}
                name="email"
                label="Email"
                type="email"
                required
                warning="We'll use this to send project updates."
              />

              <ComboboxFieldWrapper
                control={form.control}
                name="framework"
                label="Framework"
                options={frameworks}
                required
                placeholder="Select framework"
                searchPlaceholder="Search frameworks..."
                emptyText="No framework found."
                warning="Choose the framework for your project."
              />

              <ComboboxFieldWrapper
                control={form.control}
                name="language"
                label="Programming Language"
                options={languages}
                required
                placeholder="Select language"
                searchPlaceholder="Search languages..."
                emptyText="No language found."
                warning="Choose your preferred programming language."
              />

              <ComboboxFieldWrapper
                control={form.control}
                name="country"
                label="Country"
                options={countries}
                required
                placeholder="Select country"
                searchPlaceholder="Search countries..."
                emptyText="No country found."
                warning="Choose your country for localization."
              />

              <MultiComboboxWrapper
                control={form.control}
                name="skills"
                label="Technical Skills"
                options={skills}
                required
                placeholder="Select your skills"
                searchPlaceholder="Search skills..."
                emptyText="No skills found."
                minSelections={2}
                maxSelections={5}
                warning="Choose 2-5 technical skills."
              />

              <MultiComboboxWrapper
                control={form.control}
                name="interests"
                label="Areas of Interest"
                options={interests}
                required
                placeholder="Select your interests"
                searchPlaceholder="Search interests..."
                emptyText="No interests found."
                minSelections={1}
                warning="Choose areas you're interested in."
              />

              <div className="flex gap-3 pt-4 pb-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Create Project
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
