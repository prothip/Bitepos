interface POSLayoutProps {
  children: React.ReactNode
}

export default function POSLayout({ children }: POSLayoutProps) {
  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      {children}
    </div>
  )
}
