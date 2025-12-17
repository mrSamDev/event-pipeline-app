interface LoaderProps {
	size?: "sm" | "md" | "lg";
	text?: string;
}

export function Loader({ size = "lg", text }: LoaderProps = {}) {
	const sizeClasses = {
		sm: "w-8 h-8",
		md: "w-12 h-12",
		lg: "w-16 h-16",
	};

	const borderWidths = {
		sm: "border-2",
		md: "border-3",
		lg: "border-4",
	};

	const textSizes = {
		sm: "text-xs",
		md: "text-sm",
		lg: "text-base",
	};

	return (
		<div className="flex flex-col items-center justify-center gap-3">
			<style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loader-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
			<div
				className={`${sizeClasses[size]} ${borderWidths[size]} border-gray-300 border-t-[#004747] rounded-full loader-spin`}
				role="status"
				aria-label="Loading"
			/>
			{text && (
				<p className={`${textSizes[size]} text-gray-600 font-medium`}>{text}</p>
			)}
		</div>
	);
}
