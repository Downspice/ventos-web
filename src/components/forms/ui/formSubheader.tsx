export default function FormSubheader({ header }: { header: string }) {
  return (
    <div className="w-full flex flex-col pt-4 border-gray-200 border-b  ">
      <p >{header}</p>
    </div>
  );
}
