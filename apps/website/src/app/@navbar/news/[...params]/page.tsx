import { Navbar } from '@/components/nav/navbar'

interface NavbarSlotProps {
  params: Promise<{ params: string[] }>
}

export default async function NavbarSlot({ params }: NavbarSlotProps) {
  const { params: pathParams } = await params
  return <Navbar currentPath={'/news/' + pathParams.join('/')} />
}
