/* ==========================================================================
   MARD 291 & 221 Precise Color Data with CIELAB Conversions
   ========================================================================== */
const RAW_MARD_291 = [
  { id: "A1", hex: "#FAF4C8", r: 250, g: 244, b: 200 },
  { id: "A2", hex: "#FFFFD5", r: 255, g: 255, b: 213 },
  { id: "A3", hex: "#FEFF8B", r: 254, g: 255, b: 139 },
  { id: "A4", hex: "#FBED56", r: 251, g: 237, b: 86 },
  { id: "A5", hex: "#F4D738", r: 244, g: 215, b: 56 },
  { id: "A6", hex: "#FEAC4C", r: 254, g: 172, b: 76 },
  { id: "A7", hex: "#FE8B4C", r: 254, g: 139, b: 76 },
  { id: "A8", hex: "#FFDA45", r: 255, g: 218, b: 69 },
  { id: "A9", hex: "#FF995B", r: 255, g: 153, b: 91 },
  { id: "A10", hex: "#F77C31", r: 247, g: 124, b: 49 },
  { id: "A11", hex: "#FFDD99", r: 255, g: 221, b: 153 },
  { id: "A12", hex: "#FE9F72", r: 254, g: 159, b: 114 },
  { id: "A13", hex: "#FFC365", r: 255, g: 195, b: 101 },
  { id: "A14", hex: "#FD543D", r: 253, g: 84, b: 61 },
  { id: "A15", hex: "#FFF365", r: 255, g: 243, b: 101 },
  { id: "A16", hex: "#FFFF9F", r: 255, g: 255, b: 159 },
  { id: "A17", hex: "#FFE36E", r: 255, g: 227, b: 110 },
  { id: "A18", hex: "#FEBE7D", r: 254, g: 190, b: 125 },
  { id: "A19", hex: "#FD7C72", r: 253, g: 124, b: 114 },
  { id: "A20", hex: "#FFD568", r: 255, g: 213, b: 104 },
  { id: "A21", hex: "#FFE395", r: 255, g: 227, b: 149 },
  { id: "A22", hex: "#F4F57D", r: 244, g: 245, b: 125 },
  { id: "A23", hex: "#E6C9B7", r: 230, g: 201, b: 183 },
  { id: "A24", hex: "#F7F8A2", r: 247, g: 248, b: 162 },
  { id: "A25", hex: "#FFD67D", r: 255, g: 214, b: 125 },
  { id: "A26", hex: "#FFC830", r: 255, g: 200, b: 48 },

  { id: "B1", hex: "#E6EE31", r: 230, g: 238, b: 49 },
  { id: "B2", hex: "#63F347", r: 99, g: 243, b: 71 },
  { id: "B3", hex: "#9EF780", r: 158, g: 247, b: 128 },
  { id: "B4", hex: "#5DE035", r: 93, g: 224, b: 53 },
  { id: "B5", hex: "#35E352", r: 53, g: 227, b: 82 },
  { id: "B6", hex: "#65E2A6", r: 101, g: 226, b: 166 },
  { id: "B7", hex: "#3DAF80", r: 61, g: 175, b: 128 },
  { id: "B8", hex: "#1C9C4F", r: 28, g: 156, b: 79 },
  { id: "B9", hex: "#27523A", r: 39, g: 82, b: 58 },
  { id: "B10", hex: "#95D3C2", r: 149, g: 211, b: 194 },
  { id: "B11", hex: "#5D722A", r: 93, g: 114, b: 42 },
  { id: "B12", hex: "#166F41", r: 22, g: 111, b: 65 },
  { id: "B13", hex: "#CAEB7B", r: 202, g: 235, b: 123 },
  { id: "B14", hex: "#ADE946", r: 173, g: 233, b: 70 },
  { id: "B15", hex: "#2E5132", r: 46, g: 81, b: 50 },
  { id: "B16", hex: "#C5ED9C", r: 197, g: 237, b: 156 },
  { id: "B17", hex: "#9B813A", r: 155, g: 177, b: 58 },
  { id: "B18", hex: "#E6EE49", r: 230, g: 238, b: 73 },
  { id: "B19", hex: "#24B88C", r: 36, g: 184, b: 140 },
  { id: "B20", hex: "#C2F0CC", r: 194, g: 240, b: 204 },
  { id: "B21", hex: "#156A6B", r: 21, g: 106, b: 107 },
  { id: "B22", hex: "#0B3C43", r: 11, g: 60, b: 67 },
  { id: "B23", hex: "#303A21", r: 48, g: 58, b: 33 },
  { id: "B24", hex: "#EEFCA5", r: 238, g: 252, b: 165 },
  { id: "B25", hex: "#4E846D", r: 78, g: 132, b: 109 },
  { id: "B26", hex: "#8D7A35", r: 141, g: 122, b: 53 },
  { id: "B27", hex: "#CCE1AF", r: 204, g: 225, b: 175 },
  { id: "B28", hex: "#9EE5B9", r: 158, g: 229, b: 185 },
  { id: "B29", hex: "#C5E254", r: 197, g: 226, b: 84 },
  { id: "B30", hex: "#E2FCB1", r: 226, g: 252, b: 177 },
  { id: "B31", hex: "#B0E792", r: 176, g: 231, b: 146 },
  { id: "B32", hex: "#9CAB5A", r: 156, g: 171, b: 90 },

  { id: "C1", hex: "#E8FFE7", r: 232, g: 255, b: 231 },
  { id: "C2", hex: "#A9F9FC", r: 169, g: 249, b: 252 },
  { id: "C3", hex: "#A0E2FB", r: 160, g: 226, b: 251 },
  { id: "C4", hex: "#41CCFF", r: 65, g: 204, b: 255 },
  { id: "C5", hex: "#01ACEB", r: 1, g: 172, b: 235 },
  { id: "C6", hex: "#50AAFE", r: 80, g: 170, b: 240 },
  { id: "C7", hex: "#3677D2", r: 54, g: 119, b: 210 },
  { id: "C8", hex: "#0F54C0", r: 15, g: 84, b: 192 },
  { id: "C9", hex: "#324BCA", r: 50, g: 75, b: 202 },
  { id: "C10", hex: "#3EBCE2", r: 62, g: 188, b: 226 },
  { id: "C11", hex: "#28DDDE", r: 40, g: 221, b: 222 },
  { id: "C12", hex: "#1C334D", r: 28, g: 51, b: 77 },
  { id: "C13", hex: "#CDE8FF", r: 205, g: 232, b: 255 },
  { id: "C14", hex: "#D5FDFF", r: 213, g: 253, b: 255 },
  { id: "C15", hex: "#22C4C6", r: 34, g: 196, b: 198 },
  { id: "C16", hex: "#1557A8", r: 21, g: 87, b: 168 },
  { id: "C17", hex: "#04D1F6", r: 4, g: 209, b: 246 },
  { id: "C18", hex: "#1D3344", r: 29, g: 51, b: 68 },
  { id: "C19", hex: "#1887A2", r: 24, g: 135, b: 162 },
  { id: "C20", hex: "#176DAF", r: 23, g: 109, b: 175 },
  { id: "C21", hex: "#BEDDFF", r: 190, g: 221, b: 255 },
  { id: "C22", hex: "#67B4BE", r: 103, g: 180, b: 190 },
  { id: "C23", hex: "#C8E2FF", r: 200, g: 226, b: 255 },
  { id: "C24", hex: "#7CC4FF", r: 124, g: 196, b: 255 },
  { id: "C25", hex: "#A9E5E5", r: 169, g: 229, b: 229 },
  { id: "C26", hex: "#3CAED8", r: 60, g: 174, b: 216 },
  { id: "C27", hex: "#D3DFFA", r: 211, g: 223, b: 250 },
  { id: "C28", hex: "#BBCFED", r: 187, g: 207, b: 237 },
  { id: "C29", hex: "#34488E", r: 52, g: 72, b: 142 },

  { id: "D1", hex: "#AEB4F2", r: 174, g: 180, b: 242 },
  { id: "D2", hex: "#858EDD", r: 133, g: 142, b: 221 },
  { id: "D3", hex: "#2F54AF", r: 47, g: 84, b: 175 },
  { id: "D4", hex: "#182A84", r: 24, g: 42, b: 132 },
  { id: "D5", hex: "#B843C5", r: 184, g: 67, b: 197 },
  { id: "D6", hex: "#AC7BDE", r: 172, g: 123, b: 222 },
  { id: "D7", hex: "#885483", r: 136, g: 84, b: 179 },
  { id: "D8", hex: "#E2D3FF", r: 226, g: 211, b: 255 },
  { id: "D9", hex: "#D5B9F8", r: 213, g: 185, b: 248 },
  { id: "D10", hex: "#361851", r: 54, g: 24, b: 81 },
  { id: "D11", hex: "#B9BAE1", r: 185, g: 186, b: 225 },
  { id: "D12", hex: "#DE9AD4", r: 222, g: 154, b: 212 },
  { id: "D13", hex: "#890095", r: 185, g: 0, b: 149 },
  { id: "D14", hex: "#8B279B", r: 139, g: 39, b: 155 },
  { id: "D15", hex: "#2F1F90", r: 47, g: 31, b: 144 },
  { id: "D16", hex: "#E3E1EE", r: 227, g: 225, b: 238 },
  { id: "D17", hex: "#C4D4F6", r: 196, g: 212, b: 246 },
  { id: "D18", hex: "#A45EC7", r: 164, g: 94, b: 199 },
  { id: "D19", hex: "#D8C3D7", r: 216, g: 195, b: 215 },
  { id: "D20", hex: "#9C32B2", r: 156, g: 50, b: 178 },
  { id: "D21", hex: "#9A009B", r: 154, g: 0, b: 155 },
  { id: "D22", hex: "#333A95", r: 51, g: 58, b: 149 },
  { id: "D23", hex: "#EBDAFC", r: 235, g: 218, b: 252 },
  { id: "D24", hex: "#7786E5", r: 119, g: 134, b: 229 },
  { id: "D25", hex: "#494FC7", r: 73, g: 79, b: 199 },
  { id: "D26", hex: "#DFC2F8", r: 223, g: 194, b: 248 },

  { id: "E1", hex: "#FDD3CC", r: 253, g: 211, b: 204 },
  { id: "E2", hex: "#FEC0DF", r: 254, g: 192, b: 223 },
  { id: "E3", hex: "#FFB7E7", r: 255, g: 183, b: 231 },
  { id: "E4", hex: "#E8649E", r: 232, g: 100, b: 158 },
  { id: "E5", hex: "#F551A2", r: 245, g: 81, b: 162 },
  { id: "E6", hex: "#F13D74", r: 241, g: 61, b: 116 },
  { id: "E7", hex: "#C63478", r: 198, g: 52, b: 120 },
  { id: "E8", hex: "#FFDBE9", r: 255, g: 219, b: 233 },
  { id: "E9", hex: "#E970CC", r: 233, g: 112, b: 204 },
  { id: "E10", hex: "#D33793", r: 211, g: 55, b: 147 },
  { id: "E11", hex: "#FCDDD2", r: 252, g: 221, b: 210 },
  { id: "E12", hex: "#F78FC3", r: 247, g: 143, b: 195 },
  { id: "E13", hex: "#B5006D", r: 181, g: 0, b: 109 },
  { id: "E14", hex: "#FFD1BA", r: 255, g: 209, b: 186 },
  { id: "E15", hex: "#FBC7C9", r: 248, g: 199, b: 201 },
  { id: "E16", hex: "#FFF3EB", r: 255, g: 243, b: 235 },
  { id: "E17", hex: "#FFE2EA", r: 255, g: 226, b: 234 },
  { id: "E18", hex: "#FFC7DB", r: 255, g: 199, b: 219 },
  { id: "E19", hex: "#FEBAD5", r: 254, g: 186, b: 213 },
  { id: "E20", hex: "#D8C7D1", r: 216, g: 199, b: 209 },
  { id: "E21", hex: "#BD9DA1", r: 189, g: 157, b: 161 },
  { id: "E22", hex: "#B785A1", r: 183, g: 133, b: 161 },
  { id: "E23", hex: "#937A8D", r: 147, g: 122, b: 141 },
  { id: "E24", hex: "#E1BCE8", r: 225, g: 188, b: 232 },

  { id: "F1", hex: "#FD957B", r: 253, g: 149, b: 123 },
  { id: "F2", hex: "#FC3D46", r: 252, g: 61, b: 70 },
  { id: "F3", hex: "#F74941", r: 247, g: 73, b: 65 },
  { id: "F4", hex: "#FC283C", r: 252, g: 40, b: 60 },
  { id: "F5", hex: "#E7002F", r: 231, g: 0, b: 47 },
  { id: "F6", hex: "#943630", r: 148, g: 54, b: 48 },
  { id: "F7", hex: "#971937", r: 151, g: 25, b: 55 },
  { id: "F8", hex: "#BC0028", r: 188, g: 0, b: 40 },
  { id: "F9", hex: "#E2677A", r: 226, g: 103, b: 122 },
  { id: "F10", hex: "#8A4526", r: 138, g: 69, b: 38 },
  { id: "F11", hex: "#5A2121", r: 90, g: 33, b: 33 },
  { id: "F12", hex: "#FD4E6A", r: 253, g: 78, b: 106 },
  { id: "F13", hex: "#F35744", r: 243, g: 87, b: 68 },
  { id: "F14", hex: "#FFA9AD", r: 255, g: 169, b: 173 },
  { id: "F15", hex: "#D30022", r: 211, g: 0, b: 34 },
  { id: "F16", hex: "#FEC2A6", r: 254, g: 194, b: 166 },
  { id: "F17", hex: "#E69C79", r: 230, g: 156, b: 121 },
  { id: "F18", hex: "#D37C46", r: 211, g: 124, b: 70 },
  { id: "F19", hex: "#C1444A", r: 193, g: 68, b: 74 },
  { id: "F20", hex: "#CD9391", r: 205, g: 147, b: 145 },
  { id: "F21", hex: "#F7B4C6", r: 247, g: 180, b: 198 },
  { id: "F22", hex: "#FDC0D0", r: 253, g: 192, b: 208 },
  { id: "F23", hex: "#F67E66", r: 246, g: 126, b: 102 },
  { id: "F24", hex: "#E698AA", r: 230, g: 152, b: 170 },
  { id: "F25", hex: "#E54B4F", r: 229, g: 75, b: 79 },

  { id: "G1", hex: "#FFE2CE", r: 255, g: 226, b: 206 },
  { id: "G2", hex: "#FFC4AA", r: 255, g: 196, b: 170 },
  { id: "G3", hex: "#F4C3A5", r: 244, g: 195, b: 165 },
  { id: "G4", hex: "#E1B383", r: 225, g: 179, b: 131 },
  { id: "G5", hex: "#EDB045", r: 237, g: 176, b: 69 },
  { id: "G6", hex: "#E99C17", r: 233, g: 156, b: 23 },
  { id: "G7", hex: "#9D5B3E", r: 157, g: 91, b: 62 },
  { id: "G8", hex: "#753832", r: 117, g: 56, b: 50 },
  { id: "G9", hex: "#E6B483", r: 230, g: 180, b: 131 },
  { id: "G10", hex: "#D98C39", r: 217, g: 140, b: 57 },
  { id: "G11", hex: "#E0C593", r: 224, g: 197, b: 147 },
  { id: "G12", hex: "#FFC890", r: 255, g: 200, b: 144 },
  { id: "G13", hex: "#B7714A", r: 183, g: 113, b: 74 },
  { id: "G14", hex: "#8D614C", r: 141, g: 97, b: 76 },
  { id: "G15", hex: "#FCF9E0", r: 252, g: 249, b: 224 },
  { id: "G16", hex: "#F2D9BA", r: 242, g: 217, b: 186 },
  { id: "G17", hex: "#78524B", r: 120, g: 82, b: 75 },
  { id: "G18", hex: "#FFE4CC", r: 255, g: 228, b: 204 },
  { id: "G19", hex: "#E07935", r: 224, g: 121, b: 53 },
  { id: "G20", hex: "#A94023", r: 169, g: 64, b: 35 },
  { id: "G21", hex: "#B88558", r: 184, g: 133, b: 88 },

  { id: "H1", hex: "#F3F4F6", r: 243, g: 244, b: 246, isTransparent: true, name: "透明" },
  { id: "H2", hex: "#FEFFFF", r: 254, g: 255, b: 255 },
  { id: "H3", hex: "#B6B1BA", r: 182, g: 177, b: 186 },
  { id: "H4", hex: "#89858C", r: 137, g: 133, b: 140 },
  { id: "H5", hex: "#48464E", r: 72, g: 70, b: 78 },
  { id: "H6", hex: "#2F2B2F", r: 47, g: 43, b: 47 },
  { id: "H7", hex: "#000000", r: 0, g: 0, b: 0 },
  { id: "H8", hex: "#E7D6DB", r: 231, g: 214, b: 219 },
  { id: "H9", hex: "#EDEDED", r: 237, g: 237, b: 237 },
  { id: "H10", hex: "#EEE9EA", r: 238, g: 233, b: 234 },
  { id: "H11", hex: "#CECDD5", r: 206, g: 205, b: 213 },
  { id: "H12", hex: "#FFF5ED", r: 255, g: 245, b: 237 },
  { id: "H13", hex: "#F5ECD2", r: 245, g: 236, b: 210 },
  { id: "H14", hex: "#CFD7D3", r: 207, g: 215, b: 211 },
  { id: "H15", hex: "#98A6A8", r: 152, g: 166, b: 168 },
  { id: "H16", hex: "#1D1414", r: 29, g: 20, b: 20 },
  { id: "H17", hex: "#F1EDED", r: 241, g: 237, b: 237 },
  { id: "H18", hex: "#FFFDF0", r: 255, g: 253, b: 240 },
  { id: "H19", hex: "#F6EFE2", r: 246, g: 239, b: 226 },
  { id: "H20", hex: "#949FA3", r: 148, g: 159, b: 163 },
  { id: "H21", hex: "#FFFBE1", r: 255, g: 251, b: 225 },
  { id: "H22", hex: "#CACAD4", r: 202, g: 202, b: 212 },
  { id: "H23", hex: "#9A9D94", r: 154, g: 157, b: 148 },

  { id: "M1", hex: "#BCC6B8", r: 188, g: 198, b: 184 },
  { id: "M2", hex: "#8AA386", r: 138, g: 163, b: 134 },
  { id: "M3", hex: "#697D80", r: 105, g: 125, b: 128 },
  { id: "M4", hex: "#E3D2BC", r: 227, g: 210, b: 188 },
  { id: "M5", hex: "#D0CCAA", r: 208, g: 204, b: 170 },
  { id: "M6", hex: "#B0A782", r: 176, g: 167, b: 130 },
  { id: "M7", hex: "#B4A497", r: 180, g: 164, b: 151 },
  { id: "M8", hex: "#B38281", r: 179, g: 130, b: 129 },
  { id: "M9", hex: "#A58767", r: 165, g: 135, b: 103 },
  { id: "M10", hex: "#C5B2BC", r: 197, g: 178, b: 188 },
  { id: "M11", hex: "#9F7594", r: 159, g: 117, b: 148 },
  { id: "M12", hex: "#644749", r: 100, g: 71, b: 73 },
  { id: "M13", hex: "#D19066", r: 209, g: 144, b: 102 },
  { id: "M14", hex: "#C77362", r: 199, g: 115, b: 98 },
  { id: "M15", hex: "#757D78", r: 117, g: 125, b: 120 },

  { id: "P1", hex: "#FCF7F8", r: 252, g: 247, b: 248 },
  { id: "P2", hex: "#B0A9AC", r: 176, g: 169, b: 172 },
  { id: "P3", hex: "#AFDCAB", r: 175, g: 220, b: 171 },
  { id: "P4", hex: "#FEA49F", r: 254, g: 164, b: 159 },
  { id: "P5", hex: "#EE8C3E", r: 238, g: 140, b: 62 },
  { id: "P6", hex: "#5FD0A7", r: 95, g: 208, b: 167 },
  { id: "P7", hex: "#EB9270", r: 235, g: 146, b: 112 },
  { id: "P8", hex: "#F0D958", r: 240, g: 217, b: 88 },
  { id: "P9", hex: "#D9D9D9", r: 217, g: 217, b: 217 },
  { id: "P10", hex: "#D9C7EA", r: 217, g: 199, b: 234 },
  { id: "P11", hex: "#F3ECC9", r: 243, g: 236, b: 201 },
  { id: "P12", hex: "#E6EEF2", r: 230, g: 238, b: 242 },
  { id: "P13", hex: "#AACBEF", r: 170, g: 203, b: 239 },
  { id: "P14", hex: "#337680", r: 51, g: 118, b: 128 },
  { id: "P15", hex: "#668575", r: 102, g: 133, b: 117 },
  { id: "P16", hex: "#FEBF45", r: 254, g: 191, b: 69 },
  { id: "P17", hex: "#FEA324", r: 254, g: 163, b: 36 },
  { id: "P18", hex: "#FEB89F", r: 254, g: 184, b: 159 },
  { id: "P19", hex: "#FFFEEC", r: 255, g: 254, b: 236 },
  { id: "P20", hex: "#FEBECF", r: 254, g: 190, b: 207 },
  { id: "P21", hex: "#ECBEBF", r: 236, g: 190, b: 191 },
  { id: "P22", hex: "#E4A89F", r: 228, g: 168, b: 159 },
  { id: "P23", hex: "#A56268", r: 165, g: 98, b: 104 },

  { id: "Q1", hex: "#F2A5E8", r: 242, g: 165, b: 232 },
  { id: "Q2", hex: "#E9EC91", r: 233, g: 236, b: 145 },
  { id: "Q3", hex: "#FFFF00", r: 255, g: 255, b: 0 },
  { id: "Q4", hex: "#FFEBFA", r: 255, g: 235, b: 250 },
  { id: "Q5", hex: "#76CEDE", r: 118, g: 206, b: 222 },

  { id: "R1", hex: "#D50D21", r: 213, g: 13, b: 33 },
  { id: "R2", hex: "#F92F83", r: 249, g: 47, b: 131 },
  { id: "R3", hex: "#FD8324", r: 253, g: 131, b: 36 },
  { id: "R4", hex: "#F8EC31", r: 248, g: 236, b: 49 },
  { id: "R5", hex: "#35C75B", r: 53, g: 199, b: 91 },
  { id: "R6", hex: "#238891", r: 35, g: 136, b: 146 },
  { id: "R7", hex: "#19779D", r: 25, g: 119, b: 157 },
  { id: "R8", hex: "#1A60C3", r: 26, g: 96, b: 195 },
  { id: "R9", hex: "#9A56B4", r: 154, g: 86, b: 180 },
  { id: "R10", hex: "#FFDB4C", r: 255, g: 219, b: 76 },
  { id: "R11", hex: "#FFEBFA", r: 255, g: 235, b: 250 },
  { id: "R12", hex: "#D8D5CE", r: 216, g: 213, b: 206 },
  { id: "R13", hex: "#55514C", r: 85, g: 81, b: 76 },
  { id: "R14", hex: "#9FE4DF", r: 159, g: 228, b: 223 },
  { id: "R15", hex: "#77CEE9", r: 119, g: 206, b: 233 },
  { id: "R16", hex: "#3ECFCA", r: 62, g: 207, b: 202 },
  { id: "R17", hex: "#4A867A", r: 74, g: 134, b: 122 },
  { id: "R18", hex: "#7FCD9D", r: 127, g: 205, b: 157 },
  { id: "R19", hex: "#CDE55D", r: 205, g: 229, b: 93 },
  { id: "R20", hex: "#E8C7B4", r: 232, g: 199, b: 180 },
  { id: "R21", hex: "#AD6F3C", r: 173, g: 111, b: 60 },
  { id: "R22", hex: "#6C372F", r: 108, g: 55, b: 47 },
  { id: "R23", hex: "#FEB872", r: 254, g: 184, b: 114 },
  { id: "R24", hex: "#F3C1C0", r: 243, g: 193, b: 192 },
  { id: "R25", hex: "#C9675E", r: 201, g: 103, b: 94 },
  { id: "R26", hex: "#D293BE", r: 210, g: 147, b: 190 },
  { id: "R27", hex: "#EA8CB1", r: 234, g: 140, b: 177 },
  { id: "R28", hex: "#9C87D6", r: 156, g: 135, b: 214 },

  { id: "T1", hex: "#FFFFFF", r: 255, g: 255, b: 255 },

  { id: "Y1", hex: "#FD6FB4", r: 253, g: 111, b: 180 },
  { id: "Y2", hex: "#FEB481", r: 254, g: 180, b: 129 },
  { id: "Y3", hex: "#D7FAA0", r: 215, g: 250, b: 160 },
  { id: "Y4", hex: "#8BDBFA", r: 139, g: 219, b: 250 },
  { id: "Y5", hex: "#E987EA", r: 233, g: 135, b: 234 },

  { id: "ZG1", hex: "#DAABB3", r: 218, g: 171, b: 179 },
  { id: "ZG2", hex: "#D6AA87", r: 214, g: 170, b: 135 },
  { id: "ZG3", hex: "#C1BD8D", r: 193, g: 189, b: 141 },
  { id: "ZG4", hex: "#96869F", r: 150, g: 134, b: 159 },
  { id: "ZG5", hex: "#8490A6", r: 132, g: 144, b: 166 },
  { id: "ZG6", hex: "#94BFE2", r: 148, g: 191, b: 226 },
  { id: "ZG7", hex: "#E2A9D2", r: 226, g: 169, b: 210 },
  { id: "ZG8", hex: "#AB91C0", r: 171, g: 145, b: 192 }
];

// 精准 sRGB 到 CIELAB 色彩空间转换
function rgbToLab(r, g, b) {
  let rLin = r / 255, gLin = g / 255, bLin = b / 255;
  rLin = (rLin > 0.04045) ? Math.pow((rLin + 0.055) / 1.055, 2.4) : rLin / 12.92;
  gLin = (gLin > 0.04045) ? Math.pow((gLin + 0.055) / 1.055, 2.4) : gLin / 12.92;
  bLin = (bLin > 0.04045) ? Math.pow((bLin + 0.055) / 1.055, 2.4) : bLin / 12.92;

  // Observer = 2°, Illuminant = D65
  const X = (rLin * 0.4124 + gLin * 0.3576 + bLin * 0.1805) / 0.95047;
  const Y = (rLin * 0.2126 + gLin * 0.7152 + bLin * 0.0722) / 1.00000;
  const Z = (rLin * 0.0193 + gLin * 0.1192 + bLin * 0.9505) / 1.08883;

  const fx = (X > 0.008856) ? Math.cbrt(X) : (7.787 * X) + (16 / 116);
  const fy = (Y > 0.008856) ? Math.cbrt(Y) : (7.787 * Y) + (16 / 116);
  const fz = (Z > 0.008856) ? Math.cbrt(Z) : (7.787 * Z) + (16 / 116);

  return {
    L: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  };
}

// 预热预挂载 LAB 坐标
const MARD_291 = RAW_MARD_291.map(c => ({
  ...c,
  lab: rgbToLab(c.r, c.g, c.b)
}));

// MARD 221 标准子集 (A-M 系列，排除 T1 透明)
const MARD_221 = MARD_291.filter(c => {
  const prefix = c.id.charAt(0);
  return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'M'].includes(prefix) && c.id !== 'T1';
});

const OPAQUE_PALETTE_221 = MARD_221.filter(c => c.id !== 'H1');
const OPAQUE_PALETTE_291 = MARD_291.filter(c => c.id !== 'H1' && c.id !== 'T1');

// 感知色差公式
function deltaE(lab1, lab2) {
  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  const c1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
  const c2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
  const dC = c1 - c2;
  const dH2 = da * da + db * db - dC * dC;
  const dH = dH2 > 0 ? Math.sqrt(dH2) : 0;
  const sL = 1;
  const sC = 1 + 0.045 * c1;
  const sH = 1 + 0.015 * c1;
  return Math.sqrt(
    Math.pow(dL / sL, 2) +
    Math.pow(dC / sC, 2) +
    Math.pow(dH / sH, 2)
  );
}

const H7_COLOR = MARD_291.find(c => c.id === 'H7');
const H1_COLOR = MARD_291.find(c => c.id === 'H1');