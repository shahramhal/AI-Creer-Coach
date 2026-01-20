import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  MapPin, 
  Building2, 
  Clock,
  Check,
  X
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  matchScore: number;
  postedAgo: string;
  skills: { name: string; matched: boolean }[];
  remote: boolean;
}

const jobs: Job[] = [
  {
    id: "1",
    title: "Senior Frontend Engineer",
    company: "Stripe",
    location: "San Francisco, CA",
    salary: "$180k - $220k",
    matchScore: 94,
    postedAgo: "2 hours ago",
    skills: [
      { name: "React", matched: true },
      { name: "TypeScript", matched: true },
      { name: "GraphQL", matched: false },
    ],
    remote: true,
  },
  {
    id: "2",
    title: "Staff Software Engineer",
    company: "Vercel",
    location: "Remote",
    salary: "$200k - $260k",
    matchScore: 89,
    postedAgo: "1 day ago",
    skills: [
      { name: "Next.js", matched: true },
      { name: "Node.js", matched: true },
      { name: "AWS", matched: false },
    ],
    remote: true,
  },
  {
    id: "3",
    title: "Principal Engineer",
    company: "Netflix",
    location: "Los Gatos, CA",
    salary: "$250k - $350k",
    matchScore: 85,
    postedAgo: "3 days ago",
    skills: [
      { name: "Java", matched: false },
      { name: "Microservices", matched: true },
      { name: "Kafka", matched: false },
    ],
    remote: false,
  },
];

function getMatchColor(score: number) {
  if (score >= 90) return "text-metric-excellent";
  if (score >= 70) return "text-metric-good";
  if (score >= 50) return "text-metric-average";
  return "text-metric-poor";
}

function getMatchBg(score: number) {
  if (score >= 90) return "bg-metric-excellent";
  if (score >= 70) return "bg-metric-good";
  if (score >= 50) return "bg-metric-average";
  return "bg-metric-poor";
}

export function JobMatchPreview() {
  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Top Job Matches
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
          View All Jobs
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="group rounded-lg border border-border p-4 transition-all hover:border-primary/30 hover:shadow-glow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{job.title}</h3>
                    {job.remote && (
                      <Badge variant="secondary" className="text-xs">
                        Remote
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {job.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {job.postedAgo}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-sm font-medium text-foreground">
                    {job.salary}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-mono text-2xl font-bold ${getMatchColor(job.matchScore)}`}>
                      {job.matchScore}%
                    </span>
                    <span className="text-xs text-muted-foreground">match</span>
                  </div>
                  <Progress
                    value={job.matchScore}
                    className="mt-2 h-1.5 w-20"
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <Badge
                    key={skill.name}
                    variant="outline"
                    className={
                      skill.matched
                        ? "border-metric-excellent/30 bg-metric-excellent/10 text-metric-excellent"
                        : "border-metric-poor/30 bg-metric-poor/10 text-metric-poor"
                    }
                  >
                    {skill.matched ? (
                      <Check className="mr-1 h-3 w-3" />
                    ) : (
                      <X className="mr-1 h-3 w-3" />
                    )}
                    {skill.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
