type LoaderProps = {
  size?: 'sm' | 'md' | 'lg'
  colorClass?: string
  className?: string
}

export function Loader({ size = 'md', colorClass = 'bg-blue-500', className }: LoaderProps) {
  const sizeClass = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'
  return (
    <div className={`flex items-center justify-center gap-2 ${className ?? ''}`}>
      <div className={`${sizeClass} ${colorClass} rounded-full animate-bounce [animation-delay:-0.3s]`}></div>
      <div className={`${sizeClass} ${colorClass} rounded-full animate-bounce [animation-delay:-0.15s]`}></div>
      <div className={`${sizeClass} ${colorClass} rounded-full animate-bounce`}></div>
    </div>
  )
}
