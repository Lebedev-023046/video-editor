import { useEffect, useState } from "react";

interface DownloadResultProps {
	file: File | null;
}

export function DownloadResult({ file }: DownloadResultProps) {
	const [objectUrl, setObjectUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!file) {
			setObjectUrl((currentUrl) => {
				if (currentUrl) {
					URL.revokeObjectURL(currentUrl);
				}
				return null;
			});
			return;
		}

		const nextUrl = URL.createObjectURL(file);
		setObjectUrl((currentUrl) => {
			if (currentUrl) {
				URL.revokeObjectURL(currentUrl);
			}
			return nextUrl;
		});

		return () => {
			URL.revokeObjectURL(nextUrl);
		};
	}, [file]);

	return (
		<section className="download-result">
			<a
				className={`primary-button download-button${file && objectUrl ? "" : " download-button-hidden"}`}
				href={objectUrl ?? undefined}
				download={file?.name}
				aria-disabled={!file || !objectUrl}
				tabIndex={!file || !objectUrl ? -1 : 0}
			>
				Скачать результат
			</a>
		</section>
	);
}
