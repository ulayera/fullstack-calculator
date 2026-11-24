type ErrorFooterProps = { errors: string[] }

export function ErrorFooter({ errors }: ErrorFooterProps) {
  return (
    <footer className="calculator__footer" aria-live="polite">
      {errors.length > 0 && (
        <ul className="calculator__errors" role="alert">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </footer>
  )
}
