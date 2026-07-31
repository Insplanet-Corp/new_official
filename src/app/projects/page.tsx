import type { Metadata } from 'next';
import BodyClass from '@/components/BodyClass';
import PageShell from '@/components/PageShell';
import ProjectsExplorer from '@/components/projects/ProjectsExplorer';
import ProjectsHero from '@/components/projects/ProjectsHero';
import '@/styles/projects.css';

export const metadata: Metadata = { title: 'Insplanet — Projects' };

export default function ProjectsPage() {
  return (
    <>
      <BodyClass name="projects-page" />
      <PageShell>
        <main className="pj">
          <ProjectsHero />
          <ProjectsExplorer />
        </main>
      </PageShell>
    </>
  );
}
