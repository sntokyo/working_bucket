// XXX153_EFG61_0100000_202407310000001_001_99999aaa.bin
// というファイルがあります。このファイル名からXXXXXXの部分を取り出す場合はどういうスクリプトになりますか。

function extractPrefix(fileName: string): string | null {
    const match = fileName.match(/^([A-Z0-9]+)_/);
    return match ? match[1] : null;
}

const fileName = "XX1X2X_EFG61_0100000_202407310000001_001_99999aaa.bin";
const prefix = extractPrefix(fileName);

console.log(prefix); // 出力: XX1X2X


// XXX153_EFG61_0100000_202407310000001_001_99999aaa.bin
// というファイルがあります。このファイル名からXXX153_EFG61_0100000_202407310000001_001_99999aaa.send
// というファイル名を作成するにはどういうスクリプトになりますか。

function transformFileName(fileName: string): string {
    // 元のファイル名から拡張子を除去
    const baseName = fileName.replace(/\.[^/.]+$/, "");

    // 新しい拡張子を付加して新しいファイル名を作成
    const newFileName = `${baseName}.send`;

    return newFileName;
}

const originalFileName = "XXX153_EFG61_0100000_202407310000001_001_99999aaa.bin";
const newFileName = transformFileName(originalFileName);

console.log(newFileName); // 出力: XXX153_EFG61_0100000_202407310000001_001_99999aaa.send


// yyyy-file-rep-1234567というS3bucketから
