/**
 * Footer component with auto-generated year and copyright
 */
export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="text-center text-sm text-slate-500">
          <p>
            &copy; {currentYear} Jochen. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
