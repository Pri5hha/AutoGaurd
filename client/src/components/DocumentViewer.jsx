const DocumentViewer = ({ documents = [] }) => {
  return (
    <div className="panel">
      <h3>Document Viewer</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>SHA256</th>
              <th>DigiLocker</th>
              <th>Aadhaar</th>
              <th>NAD</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.hashSha256}>
                <td>{doc.name}</td>
                <td>{doc.type}</td>
                <td className="mono">{doc.hashSha256.slice(0, 16)}...</td>
                <td>{doc.verification?.digilocker || "unverified"}</td>
                <td>{doc.verification?.aadhaar || "unverified"}</td>
                <td>{doc.verification?.nad || "unverified"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentViewer;
