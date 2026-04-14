import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import type { Project } from '@/lib/types';

export function ProjectListPage() {
  const { items: projects, loading } = useEntityCRUD<Project>('projects');
  const navigate = useNavigate();

  if (loading) {
    return <p className="py-8 text-center text-muted-foreground">Loading projects...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Projects</h2>
        <Button onClick={() => navigate('/projects/new')}>New Project</Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          message="No projects yet. Create one to get started."
          actionLabel="New Project"
          onAction={() => navigate('/projects/new')}
        />
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardHeader className="p-4">
                <CardTitle className="text-base">{project.name}</CardTitle>
                <CardDescription className="text-sm">
                  {[project.date_started, project.performed_by]
                    .filter(Boolean)
                    .join(' \u2022 ')}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
