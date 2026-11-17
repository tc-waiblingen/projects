import { Navbar } from '@/components/nav/navbar'

interface NavbarSlotProps {
  params: Promise<{ slug?: string[] }>
}

function slugToPermalink(slug?: string[]): string {
  if (!slug || slug.length === 0) {
    return '/'
  }
  return '/' + slug.join('/')
}

export default async function NavbarSlot({ params }: NavbarSlotProps) {
  const { slug } = await params
  return <Navbar currentPath={slugToPermalink(slug)} />
}
