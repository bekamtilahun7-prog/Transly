export default function SectionTitle({ text1, text2, text3 }) {
    return (
        <>
            <p className="text-center font-medium text-orange-500 mt-28">
                <span className="inline-flex items-center gap-2">
                    <span className="home-loop home-loop-pulse size-2 rounded-full bg-orange-500" aria-hidden />
                    {text1}
                </span>
            </p>
            <h3 className="text-3xl font-semibold text-center mx-auto mt-2 text-ink">{text2}</h3>
            <p className="text-sm text-ink-2 text-center mt-4 max-w-lg mx-auto">{text3}</p>
        </>
    );
}