import { useEffect, useState } from "react";

import { getDownloadFileName } from "../../../widgets/shared/lib/browser/download-file";
import {
	createObjectUrl,
	revokeObjectUrl,
} from "../../../widgets/shared/lib/browser/object-url";

interface DownloadResultProps {
	file: File | null;
}

export function DownloadResult({ file }: DownloadResultProps) {
	const [objectUrl, setObjectUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!file) {
			setObjectUrl((currentUrl) => {
				revokeObjectUrl(currentUrl);
				return null;
			});
			return;
		}

		const nextUrl = createObjectUrl(file);
		setObjectUrl((currentUrl) => {
			revokeObjectUrl(currentUrl);
			return nextUrl;
		});

		return () => {
			revokeObjectUrl(nextUrl);
		};
	}, [file]);

	return (
		<section className="download-result">
			<a
				className={`primary-button download-button${file && objectUrl ? "" : " download-button-hidden"}`}
				href={objectUrl ?? undefined}
				download={getDownloadFileName(file?.name)}
				aria-disabled={!file || !objectUrl}
				tabIndex={!file || !objectUrl ? -1 : 0}
			>
				Скачать результат
			</a>
		</section>
	);
}
