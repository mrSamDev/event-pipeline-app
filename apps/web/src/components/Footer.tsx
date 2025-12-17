import { Globe, Linkedin } from "lucide-react";

export function Footer() {
	return (
		<footer className="bg-white border-t border-gray-200 py-6">
			<div className="container mx-auto px-6 max-w-7xl">
				<div className="flex items-center justify-center gap-8">
					<a
						href="https://sijosam.com"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-2 text-gray-600 hover:text-[#004747] transition-colors"
					>
						<Globe size={18} />
						<span className="text-sm">sijosam.com</span>
					</a>
					<div className="w-px h-4 bg-gray-300" />
					<a
						href="https://linkedin.com/in/sijo-sam"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-2 text-gray-600 hover:text-[#004747] transition-colors"
					>
						<Linkedin size={18} />
						<span className="text-sm">LinkedIn</span>
					</a>
				</div>
			</div>
		</footer>
	);
}
