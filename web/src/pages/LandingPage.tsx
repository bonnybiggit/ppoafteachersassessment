import { Link } from 'react-router-dom'
import {
  Heart,
  MessageCircle,
  Layout,
  Lightbulb,
  BookOpen,
  Wrench,
  Cpu,
  Star,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Compass,
  FileCheck,
  TrendingUp,
  Award,
  Layers,
  BarChart3,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import SectionHeading from '../components/SectionHeading'
import CompetencyCard from '../components/CompetencyCard'

const competencies = [
  {
    number: '01',
    title: 'Human-Centred Teaching & Empathy',
    description:
      'Cultivating meaningful learner relationships, understanding diverse student backgrounds, and creating an inclusive classroom climate.',
    icon: Heart,
  },
  {
    number: '02',
    title: 'Communication & Influence',
    description:
      'Articulating concepts clearly, facilitating collaborative dialogue, and engaging learners, peers, and stakeholders effectively.',
    icon: MessageCircle,
  },
  {
    number: '03',
    title: 'Classroom Leadership & Behaviour Design',
    description:
      'Establishing constructive routines, fostering positive behaviour, and sustaining an environment conducive to focused learning.',
    icon: Layout,
  },
  {
    number: '04',
    title: 'Adaptive Teaching & Problem Solving',
    description:
      'Adjusting instructional approaches in real time, differentiating for learner needs, and addressing instructional challenges with agility.',
    icon: Lightbulb,
  },
  {
    number: '05',
    title: 'Practical Pedagogy & Learning Design',
    description:
      'Designing structured lesson plans, applying evidence-based pedagogical strategies, and aligning assessments with clear outcomes.',
    icon: BookOpen,
  },
  {
    number: '06',
    title: 'Resourcefulness & Entrepreneurial Thinking',
    description:
      'Maximising available teaching materials, improvising creative solutions, and driving initiative within the learning environment.',
    icon: Wrench,
  },
  {
    number: '07',
    title: 'Digital & Future Skills',
    description:
      'Integrating digital tools purposefully to enrich instruction, support digital literacy, and prepare learners for modern contexts.',
    icon: Cpu,
  },
  {
    number: '08',
    title: 'Personal Effectiveness & Professional Identity',
    description:
      'Maintaining reflective practice, engaging in continuous self-improvement, and demonstrating professional ethics and commitment.',
    icon: Star,
  },
  {
    number: '09',
    title: 'Community Engagement',
    description:
      'Building constructive partnerships with families, local communities, and educational stakeholders to support holistic learner growth.',
    icon: Building2,
  },
]

const steps = [
  {
    step: '01',
    title: 'Complete Your Assessment',
    description:
      'Respond to practical scenarios and self-reflection prompts covering all nine core competency domains.',
    icon: FileCheck,
  },
  {
    step: '02',
    title: 'Understand Your Competency Profile',
    description:
      'Receive an objective breakdown highlighting your key teaching strengths alongside prioritized development areas.',
    icon: BarChart3,
  },
  {
    step: '03',
    title: 'Follow Your Personalised Growth Plan',
    description:
      'Engage with targeted learning recommendations, curated resources, and upskilling pathways designed for your profile.',
    icon: TrendingUp,
  },
]

const growthCapabilities = [
  'Complete a guided competency assessment across 9 domains',
  'Understand your unique competency profile and strengths',
  'Identify priority development gaps with clarity',
  'Receive personalised learning and upskilling recommendations',
  'Follow a structured, self-paced professional growth plan',
  'Reassess competencies over time to track ongoing progress',
]

const learningFeatures = [
  {
    title: 'Personalised Recommendations',
    description:
      'Upskilling modules and developmental suggestions matched specifically to identified competency needs.',
    icon: Sparkles,
  },
  {
    title: 'Relevant Courses & Content',
    description:
      'Practical pedagogical resources and upskilling materials tailored for educators in diverse classroom settings.',
    icon: BookOpen,
  },
  {
    title: 'Development Priorities',
    description:
      'Clear, actionable focus areas ensuring professional development time is spent where it matters most.',
    icon: Compass,
  },
  {
    title: 'Progress Tracking',
    description:
      'Structured milestones allowing teachers to monitor improvements and celebrate competency gains.',
    icon: TrendingUp,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5]">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 px-4 sm:px-6 lg:px-8 border-b border-[#ede8e1] bg-gradient-to-b from-white to-[#faf8f5]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#0c3b6e] text-xs font-semibold uppercase tracking-wider">
              <GraduationCap className="h-4 w-4" />
              <span>Teacher Competency Framework</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0c3b6e] leading-tight tracking-tight">
              Understand Your Teaching Strengths. <br />
              <span className="text-[#b81c1c]">Grow With Purpose.</span>
            </h1>
            <p className="text-lg text-gray-700 leading-relaxed max-w-2xl">
              Discover your teaching strengths, understand your development gaps, and receive
              personalised learning recommendations designed to support your professional growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-[#0c3b6e] text-white px-7 py-3.5 rounded-md font-semibold hover:bg-[#082a50] transition-colors shadow-sm text-center"
              >
                <span>Start Your Assessment</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 border-2 border-[#0c3b6e] text-[#0c3b6e] px-7 py-3.5 rounded-md font-semibold hover:bg-blue-50 transition-colors text-center"
              >
                <span>How It Works</span>
              </a>
            </div>
          </div>

          {/* Abstract Educational Visual */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md bg-white rounded-2xl p-6 shadow-xl border border-[#ede8e1]">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#0c3b6e] text-white flex items-center justify-center font-bold text-xs">
                    P
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0c3b6e]">Competency Overview</p>
                    <p className="text-[10px] text-gray-500">Holistic Diagnostic Model</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  <CheckCircle2 className="h-3 w-3" />
                  Developmental
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Heart className="h-4 w-4 text-[#0c3b6e]" />
                    <span className="text-xs font-semibold text-gray-800">Human-Centred Pedagogy</span>
                  </div>
                  <span className="text-xs font-bold text-[#0c3b6e]">Core Strength</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Lightbulb className="h-4 w-4 text-[#b81c1c]" />
                    <span className="text-xs font-semibold text-gray-800">Adaptive Teaching</span>
                  </div>
                  <span className="text-xs font-bold text-[#b81c1c]">Growth Focus</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Cpu className="h-4 w-4 text-[#0c3b6e]" />
                    <span className="text-xs font-semibold text-gray-800">Digital & Future Skills</span>
                  </div>
                  <span className="text-xs font-medium text-gray-600">Upskilling Pathway</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-[#0c3b6e]" />
                  <span>9 Competency Areas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-[#b81c1c]" />
                  <span>Personalised Growth</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust / Introduction Section */}
      <section className="py-14 bg-white border-b border-[#ede8e1]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-xs font-bold tracking-widest uppercase text-[#b81c1c]">
            Our Foundation & Purpose
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0c3b6e]">
            Development, Not Judgement.
          </h2>
          <p className="text-base text-gray-700 leading-relaxed max-w-3xl mx-auto">
            The PPOAF Teachers Assessment is designed to provide teachers with a clearer understanding
            of their professional competencies and development needs. Rooted in developmental support,
            the framework celebrates what educators do well while offering structured, supportive guidance
            for continuous professional growth.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#faf8f5] border-b border-[#ede8e1]">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            label="Methodology"
            title="How It Works"
            description="A clear three-stage journey designed to guide educators from self-assessment to targeted, purposeful upskilling."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {steps.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="bg-white rounded-xl p-8 border border-[#ede8e1] relative flex flex-col justify-between hover:border-[#0c3b6e]/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-lg bg-blue-50 text-[#0c3b6e] flex items-center justify-center">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-2xl font-extrabold text-gray-200 font-mono">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-[#0c3b6e] mb-3">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 9 Competency Domains Section */}
      <section id="competencies" className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-b border-[#ede8e1]">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            label="PPOAF Framework"
            title="Explore Your Teaching Competencies"
            description="The assessment looks across nine areas of professional competency to help identify strengths and opportunities for growth."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {competencies.map((comp) => (
              <CompetencyCard
                key={comp.number}
                number={comp.number}
                title={comp.title}
                description={comp.description}
                icon={comp.icon}
              />
            ))}
          </div>
        </div>
      </section>

      {/* For Teachers Section */}
      <section id="for-teachers" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#faf8f5] border-b border-[#ede8e1]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold tracking-widest uppercase text-[#b81c1c]">
                Teacher-Centred Platform
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0c3b6e] leading-tight">
                Built Around Your Growth
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We believe educators thrive when empowered with actionable insights rather than rigid evaluations.
                As the PPOAF platform evolves, teachers will gain access to comprehensive capabilities designed
                to support lifelong pedagogical excellence.
              </p>
              <div className="space-y-3 pt-2">
                {growthCapabilities.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#b81c1c] shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-gray-800">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white rounded-2xl p-8 border border-[#ede8e1] shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <div className="p-2.5 rounded-lg bg-red-50 text-[#b81c1c]">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0c3b6e]">Developmental Integrity</h3>
                    <p className="text-xs text-gray-500">A trusted space for self-reflection & upskilling</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Every aspect of the assessment is structured to encourage constructive self-reflection.
                  Results are formatted to provide clear, actionable feedback rather than comparative ranking.
                </p>
                <div className="bg-[#faf8f5] p-4 rounded-lg border border-[#ede8e1] text-xs text-gray-700 leading-relaxed">
                  <span className="font-bold text-[#0c3b6e]">Note:</span> Platform capabilities, including assessments and dynamic dashboards, are actively being developed step by step.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Personalised Learning Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-b border-[#ede8e1]">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            label="Upskilling & Pathways"
            title="Learning That Responds To Your Needs"
            description="Assessment results will connect teachers with relevant learning opportunities, targeted courses, and tailored development plans."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {learningFeatures.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.title}
                  className="bg-[#faf8f5] border border-[#ede8e1] rounded-xl p-6 flex flex-col justify-between hover:border-[#0c3b6e]/30 transition-colors"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-white border border-[#ede8e1] text-[#0c3b6e] flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-[#0c3b6e] mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Privacy / Developmental Purpose Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#faf8f5] border-b border-[#ede8e1]">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0c3b6e] flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0c3b6e]">
            Designed for Professional Development
          </h2>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            The platform is built strictly to support educator development and personalized upskilling.
            All diagnostic tools and learning pathways are created to foster continuous teacher growth
            in alignment with the PPOAF educational mission.
          </p>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0c3b6e] text-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Understand Your Teaching Strengths?
          </h2>
          <p className="text-base sm:text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Begin your journey toward more intentional professional growth.
          </p>
          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-[#b81c1c] text-white px-8 py-3.5 rounded-md font-semibold hover:bg-[#8f1515] transition-colors shadow-md text-base"
            >
              <span>Get Started</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
