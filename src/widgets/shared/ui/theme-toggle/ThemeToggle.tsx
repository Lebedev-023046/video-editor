import { useTheme } from "../../../../app/providers/theme/useTheme";

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();

	return (
		<button
			type="button"
			className="theme-toggle"
			onClick={toggleTheme}
			aria-label="Toggle color theme"
		>
			<span aria-hidden="true">{theme === "dark" ? "◐" : "◑"}</span>
			<strong>{theme === "dark" ? "Dark mode" : "Light mode"}</strong>
		</button>
	);
}
